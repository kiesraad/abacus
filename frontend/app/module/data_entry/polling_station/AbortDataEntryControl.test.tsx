import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@kiesraad/api";
import {
  electionMockData,
  ElectionRequestHandler,
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntrySaveHandler,
} from "@kiesraad/api-mocks";
import { renderReturningRouter, screen, server, spyOnHandler } from "@kiesraad/test";

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

    const dataEntrySave = spyOnHandler(PollingStationDataEntrySaveHandler);

    // click the save button in the modal
    await user.click(screen.getByRole("button", { name: "Invoer bewaren" }));

    // check that the save request was made with the correct data
    expect(dataEntrySave).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ...emptyDataEntryRequest.data,
          voters_counts: {
            ...emptyDataEntryRequest.data.voters_counts,
            poll_card_count: 42,
          },
        },
      }),
    );

    // check that the user is navigated back to the data entry page
    expect(router.state.location.pathname).toBe("/elections/1/data-entry");
  });

  test("deletes the data entry and navigates on delete", async () => {
    server.use(PollingStationDataEntryDeleteHandler);

    // render the abort button, then click it to open the modal
    const router = renderAbortDataEntryControl();
    const user = userEvent.setup();

    // click the abort button to open the modal
    const abortButton = await screen.findByRole("button", { name: "Invoer afbreken" });
    await user.click(abortButton);

    // set up a listener to check if the delete request is made
    const dataEntryDelete = spyOnHandler(PollingStationDataEntryDeleteHandler);

    // click the delete button in the modal
    await user.click(screen.getByRole("button", { name: "Niet bewaren" }));

    // check that the delete request was made and the user is navigated back to the data entry page
    expect(dataEntryDelete).toHaveBeenCalled();

    // check that the user is navigated back to the data entry page
    expect(router.state.location.pathname).toBe("/elections/1/data-entry");
  });
});
