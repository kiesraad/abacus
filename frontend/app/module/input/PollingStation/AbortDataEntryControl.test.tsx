import * as router from "react-router";

import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { VotersAndVotesForm } from "app/component/form/voters_and_votes/VotersAndVotesForm.tsx";
import { overrideOnce, render, screen, server } from "app/test/unit";
import { emptyDataEntryRequest } from "app/test/unit/form.ts";

import {
  DataEntryResponse,
  ElectionProvider,
  ErrorResponse,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  PollingStationFormController,
} from "@kiesraad/api";
import {
  electionDetailsMockResponse,
  electionMockData,
  pollingStationMockData,
} from "@kiesraad/api-mocks";

import { AbortDataEntryControl } from "./AbortDataEntryControl";

const mockNavigate = vi.fn();

const renderAbortDataEntryControl = () => {
  render(
    <ElectionProvider electionId={1}>
      <PollingStationFormController
        election={electionMockData}
        pollingStationId={pollingStationMockData.id}
        entryNumber={1}
      >
        <AbortDataEntryControl />
        <VotersAndVotesForm />
      </PollingStationFormController>
    </ElectionProvider>,
  );
};

describe("Test AbortDataEntryControl", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
    vi.spyOn(router, "useNavigate").mockImplementation(() => mockNavigate);
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
    renderAbortDataEntryControl();
    const user = userEvent.setup();

    // click the abort button to open the modal
    const abortButton = await screen.findByRole("button", { name: "Invoer afbreken" });
    await user.click(abortButton);

    // fill in the form
    await user.type(await screen.findByTestId("poll_card_count"), "42");

    // set up a custom request handler that saves the request body
    // this cannot be done with a listener because it would consume the request body
    let request_body: POLLING_STATION_DATA_ENTRY_REQUEST_BODY | undefined;
    server.use(
      http.post<never, POLLING_STATION_DATA_ENTRY_REQUEST_BODY, DataEntryResponse | ErrorResponse>(
        "http://testhost/api/polling_stations/1/data_entries/1",
        async ({ request }) => {
          request_body = await request.json();
          return HttpResponse.json(
            { validation_results: { errors: [], warnings: [] } },
            { status: 200 },
          );
        },
        { once: true },
      ),
    );

    // click the save button in the modal
    await user.click(screen.getByRole("button", { name: "Invoer bewaren" }));

    // check that the save request was made with the correct data
    expect(request_body).toEqual({
      data: {
        ...emptyDataEntryRequest.data,
        voters_counts: {
          ...emptyDataEntryRequest.data.voters_counts,
          poll_card_count: 42,
        },
      },
    });
    // }

    // check that the user is navigated back to the input page
    expect(mockNavigate).toHaveBeenCalledWith("/1/input");
  });

  test("deletes the data entry and navigates on delete", async () => {
    // render the abort button, then click it to open the modal
    renderAbortDataEntryControl();
    const user = userEvent.setup();

    // click the abort button to open the modal
    const abortButton = await screen.findByRole("button", { name: "Invoer afbreken" });
    await user.click(abortButton);

    // set up a listener to check if the delete request is made
    let request_method, request_url;
    overrideOnce("delete", "/api/polling_stations/1/data_entries/1", 204, null);
    server.events.on("request:start", ({ request }) => {
      request_method = request.method;
      request_url = request.url;
    });

    // click the delete button in the modal
    await user.click(screen.getByRole("button", { name: "Niet bewaren" }));

    // check that the delete request was made and the user is navigated back to the input page
    expect(request_method).toBe("DELETE");
    expect(request_url).toBe("http://testhost/api/polling_stations/1/data_entries/1");

    // check that the user is navigated back to the input page
    expect(mockNavigate).toHaveBeenCalledWith("/1/input");
  });
});
