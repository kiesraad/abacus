import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";

import {
  ElectionProvider,
  ErrorResponse,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  SaveDataEntryResponse,
} from "@kiesraad/api";
import {
  electionMockData,
  ElectionRequestHandler,
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntrySaveHandler,
} from "@kiesraad/api-mocks";
import { renderReturningRouter, screen, server } from "@kiesraad/test";

import { PollingStationFormController } from "../../../component/form/data_entry/PollingStationFormController";
import { VotersAndVotesForm } from "../../../component/form/data_entry/voters_and_votes/VotersAndVotesForm";
import { emptyDataEntryRequest } from "../../../component/form/testHelperFunctions";
import { AbortDataEntryControl } from "./AbortDataEntryControl";

const renderAbortDataEntryControl = () => {
  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <PollingStationFormController election={electionMockData} pollingStationId={1} entryNumber={1}>
        <AbortDataEntryControl />
        <VotersAndVotesForm />
      </PollingStationFormController>
    </ElectionProvider>,
  );
};

describe("Test AbortDataEntryControl", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryGetHandler, PollingStationDataEntrySaveHandler);
  });

  test("renders and toggles the modal", async () => {
    // render the abort button, then click it to open the modal
    renderAbortDataEntryControl();
    const user = userEvent.setup();

    // click the abort button to open the modal
    const abortButton = await screen.findByRole("button", { name: "Invoer afbreken" });
    await user.click(abortButton);

    // check that the modal is open
    expect(screen.getByText("Wat wil je doen met je invoer?")).toBeInTheDocument();
  });

  test("saves the form state and navigates on save", async () => {
    // render the abort button
    const router = renderAbortDataEntryControl();
    const user = userEvent.setup();

    // click the abort button to open the modal
    const abortButton = await screen.findByRole("button", { name: "Invoer afbreken" });
    await user.click(abortButton);

    // fill in the form
    await user.type(await screen.findByTestId("poll_card_count"), "42");

    // set up a custom request handler that saves the request body
    // this cannot be done with a listener because it would consume the request body
    let request_body: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY | undefined;
    server.use(
      http.post<never, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY, SaveDataEntryResponse | ErrorResponse>(
        "/api/polling_stations/1/data_entries/1",
        async ({ request }) => {
          request_body = await request.json();
          return HttpResponse.json({ validation_results: { errors: [], warnings: [] } }, { status: 200 });
        },
        { once: true },
      ),
    );

    // click the save button in the modal
    await user.click(screen.getByRole("button", { name: "Invoer bewaren" }));

    // check that the save request was made with the correct data
    expect(request_body?.data).toEqual({
      ...emptyDataEntryRequest.data,
      voters_counts: {
        ...emptyDataEntryRequest.data.voters_counts,
        poll_card_count: 42,
      },
    });

    // check that the user is navigated back to the data entry page
    expect(router.state.location.pathname).toBe("/elections/1/data-entry");
  });

  test("deletes the data entry and navigates on delete", async () => {
    // render the abort button, then click it to open the modal
    const router = renderAbortDataEntryControl();
    const user = userEvent.setup();

    // click the abort button to open the modal
    const abortButton = await screen.findByRole("button", { name: "Invoer afbreken" });
    await user.click(abortButton);

    // set up a listener to check if the delete request is made
    let request_method, request_url;
    server.use(PollingStationDataEntryDeleteHandler);
    server.events.on("request:start", ({ request }) => {
      request_method = request.method;
      request_url = request.url;
    });

    // click the delete button in the modal
    await user.click(screen.getByRole("button", { name: "Niet bewaren" }));

    // check that the delete request was made and the user is navigated back to the data entry page
    expect(request_method).toBe("DELETE");
    expect(request_url).toBe("http://localhost:3000/api/polling_stations/1/data_entries/1");

    // check that the user is navigated back to the data entry page
    expect(router.state.location.pathname).toBe("/elections/1/data-entry");
  });
});
