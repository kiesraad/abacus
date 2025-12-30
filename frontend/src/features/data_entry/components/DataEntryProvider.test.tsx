import { waitFor } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DataEntryProvider } from "@/features/data_entry/components/DataEntryProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ElectionRequestHandler, PollingStationDataEntryClaimHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import type { ErrorResponse } from "@/types/generated/openapi";

function renderProvider() {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });

  return render(
    <DataEntryProvider election={electionMockData} pollingStation={pollingStationMockData[0]!} entryNumber={1}>
      <div>Children</div>
    </DataEntryProvider>,
  );
}

describe("DataEntryProvider", () => {
  const navigate = vi.fn();
  const pushMessage = vi.fn();

  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      hasMessages: vi.fn(),
      popMessages: vi.fn(),
      pushMessage,
    });

    vi.spyOn(ReactRouter, "useNavigate").mockReturnValue(navigate);

    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler);
  });

  test("Render DataEntryProvider", async () => {
    renderProvider();
    expect(await screen.findByText("Children")).toBeInTheDocument();
  });

  test("Navigate and show message on DataEntryAlreadyClaimed", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1/claim", 409, {
      error: "First entry already claimed",
      fatal: false,
      reference: "DataEntryAlreadyClaimed",
    } satisfies ErrorResponse);

    renderProvider();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Je kan stembureau 33 niet invoeren",
        text: "Een andere invoerder is bezig met dit stembureau",
      });
      expect(navigate).toHaveBeenCalledWith("/elections/1/data-entry");
    });
  });

  test("Navigate and show message on DataEntryAlreadyFinalised", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1/claim", 409, {
      error: "First entry already finalised",
      fatal: false,
      reference: "DataEntryAlreadyFinalised",
    } satisfies ErrorResponse);

    renderProvider();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Je kan stembureau 33 niet invoeren",
        text: "De invoer voor dit stembureau is al gedaan",
      });
      expect(navigate).toHaveBeenCalledWith("/elections/1/data-entry");
    });
  });

  test("Navigate and show message on DataEntryNotAllowed", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1/claim", 409, {
      error: "Data entry not allowed, no investigation with corrected results.",
      fatal: false,
      reference: "DataEntryNotAllowed",
    } satisfies ErrorResponse);

    renderProvider();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Je kan stembureau 33 niet invoeren",
        text: "De invoer voor dit stembureau is niet toegestaan",
      });
      expect(navigate).toHaveBeenCalledWith("/elections/1/data-entry");
    });
  });

  test("Navigate and show message on InvalidStateTransition", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1/claim", 409, {
      error: "Invalid state transition",
      fatal: false,
      reference: "InvalidStateTransition",
    } satisfies ErrorResponse);

    renderProvider();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Je kan stembureau 33 niet invoeren",
        text: "Er is een ongeldige actie uitgevoerd",
      });
      expect(navigate).toHaveBeenCalledWith("/elections/1/data-entry");
    });
  });
});
