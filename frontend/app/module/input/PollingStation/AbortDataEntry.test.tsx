import * as router from "react-router";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { fireEvent, overrideOnce, render, screen, server, waitFor } from "app/test/unit";

import { ElectionProvider, PollingStationFormController } from "@kiesraad/api";
import { electionMock, electionMockResponse, pollingStationMock } from "@kiesraad/api-mocks";

import { AbortDataEntry } from "./AbortDataEntry.tsx";

const mockNavigate = vi.fn();

const renderAbortDataEntry = () => {
  render(
    <ElectionProvider electionId={1}>
      <PollingStationFormController
        election={electionMock}
        pollingStationId={pollingStationMock.id}
        entryNumber={1}
      >
        <AbortDataEntry />
      </PollingStationFormController>
    </ElectionProvider>,
  );
};

describe("Test AbortDataEntry", () => {
  beforeEach(async () => {
    overrideOnce("get", "/api/elections/1", 200, electionMockResponse);
    vi.spyOn(router, "useNavigate").mockImplementation(() => mockNavigate);

    // render the abort button, then click it to open the modal
    renderAbortDataEntry();
    const abortButton = await screen.findByText("Invoer afbreken");
    fireEvent.click(abortButton);
  });

  afterEach(() => {
    vi.clearAllMocks();
    server.restoreHandlers();
    server.events.removeAllListeners();
  });

  test("renders and toggles the modal", () => {
    expect(screen.getByText("Wat wil je doen met je invoer?")).toBeInTheDocument();
  });

  test("saves the form state and navigates on save", () => {
    fireEvent.click(screen.getByText("Invoer bewaren"));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/input"));
  });

  test("deletes the data entry and navigates on delete", async () => {
    let deleteRequestMade = false;
    overrideOnce("delete", "/api/polling_stations/1/data_entries/1", 204, null);
    server.events.on("request:start", ({ request }) => {
      if (
        request.method === "DELETE" &&
        request.url === "http://testhost/api/polling_stations/1/data_entries/1"
      ) {
        deleteRequestMade = true;
      }
    });

    fireEvent.click(screen.getByText("Niet bewaren"));
    expect(deleteRequestMade).toBe(true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/input"));
    });
  });
});
