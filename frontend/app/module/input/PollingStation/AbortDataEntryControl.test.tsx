import * as router from "react-router";

import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { overrideOnce, render, screen, server, waitFor } from "app/test/unit";

import { ElectionProvider, PollingStationFormController } from "@kiesraad/api";
import { electionMock, electionMockResponse, pollingStationMock } from "@kiesraad/api-mocks";

import { AbortDataEntryControl } from "./AbortDataEntryControl.tsx";

const mockNavigate = vi.fn();

const renderAbortDataEntryControl = () => {
  render(
    <ElectionProvider electionId={1}>
      <PollingStationFormController
        election={electionMock}
        pollingStationId={pollingStationMock.id}
        entryNumber={1}
      >
        <AbortDataEntryControl />
      </PollingStationFormController>
    </ElectionProvider>,
  );
};

describe("Test AbortDataEntryControl", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionMockResponse);
    vi.spyOn(router, "useNavigate").mockImplementation(() => mockNavigate);
  });

  afterEach(() => {
    vi.clearAllMocks();
    server.restoreHandlers();
    server.events.removeAllListeners();
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

    // click the save button in the modal
    await user.click(screen.getByRole("button", { name: "Invoer bewaren" }));

    // check that the user is navigated back to the input page
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/input$/));
  });

  test("deletes the data entry and navigates on delete", async () => {
    // render the abort button, then click it to open the modal
    renderAbortDataEntryControl();
    const user = userEvent.setup();

    // click the abort button to open the modal
    const abortButton = await screen.findByRole("button", { name: "Invoer afbreken" });
    await user.click(abortButton);

    // set up a listener to check if the delete request is made
    let deleteRequestMade = false;
    overrideOnce("delete", "/api/polling_stations/1/data_entries/1", 204, null);
    server.events.on("request:start", ({ request }) => {
      expect(request.method).toBe("DELETE");
      expect(request.url).toBe("http://testhost/api/polling_stations/1/data_entries/1");
      deleteRequestMade = true;
    });

    // click the delete button in the modal
    await user.click(screen.getByRole("button", { name: "Niet bewaren" }));

    // check that the delete request was made
    expect(deleteRequestMade).toBe(true);

    // check that the user is navigated back to the input page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching("/input$"));
    });
  });
});
