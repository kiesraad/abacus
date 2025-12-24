import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import {
  dataEntryHasWarningsGetMockResponse,
  dataEntryValidGetMockResponse,
} from "@/testing/api-mocks/DataEntryMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntriesAndResultDeleteHandler,
  PollingStationDataEntryGetHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen, spyOnHandler, waitFor, within } from "@/testing/test-utils";
import { ErrorResponse } from "@/types/generated/openapi";

import { DetailLayout } from "./DetailLayout";

const navigate = vi.fn();

const renderLayout = () => {
  return render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <MessagesProvider>
            <DetailLayout />
          </MessagesProvider>
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
};

describe("DetailLayout", () => {
  const pushMessage = vi.fn();
  const hasMessages = vi.fn();

  beforeEach(() => {
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryGetHandler,
    );
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "5" });
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage, popMessages: vi.fn(() => []), hasMessages });
    vi.spyOn(ReactRouter, "Outlet").mockReturnValue(<div>Outlet Content</div>);
  });

  test("Renders data entry detail layout with polling station header and navigation", async () => {
    renderLayout();

    const banner = await screen.findByRole("banner");

    expect(
      within(banner).getByRole("heading", { level: 1, name: "Dansschool Oeps nou deed ik het weer" }),
    ).toBeInTheDocument();
    expect(within(banner).getByText("37")).toBeInTheDocument();
    expect(within(banner).getByText("1e invoer")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Fouten en waarschuwingen" })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("Fouten en waarschuwingen oplossen - Abacus");
    });
  });

  test("Render badge for second_entry_not_started as 1e invoer", async () => {
    overrideOnce("get", "/api/polling_stations/5/data_entries/get", 200, dataEntryHasWarningsGetMockResponse);

    renderLayout();

    // Data entry has status "second_entry_not_started".
    // In Badge, "1e invoer" is overruled as label instead of "2e invoer".
    const banner = await screen.findByRole("banner");
    expect(within(banner).getByText("1e invoer")).toBeInTheDocument();
  });

  test("Delete data entry and return to status page with a message", async () => {
    server.use(PollingStationDataEntriesAndResultDeleteHandler);
    overrideOnce("get", "/api/polling_stations/5/data_entries/get", 200, dataEntryValidGetMockResponse);
    const user = userEvent.setup();

    renderLayout();

    const deleteButton = await screen.findByRole("button", { name: "Invoer verwijderen" });
    await user.click(deleteButton);

    const modal = await screen.findByTestId("modal-dialog");
    expect(modal).toHaveTextContent(
      "Weet je zeker dat je de invoer voor stembureau 37 wilt verwijderen? Deze actie kan niet worden teruggedraaid.",
    );
    const deleteDataEntries = spyOnHandler(PollingStationDataEntriesAndResultDeleteHandler);

    const confirmButton = await within(modal).findByRole("button", { name: "Verwijder invoer" });
    await user.click(confirmButton);

    expect(deleteDataEntries).toHaveBeenCalled();

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Invoer verwijderd",
      text: "Stembureau 37 is weer toegevoegd aan de werkvoorraad en kan opnieuw worden ingevoerd.",
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/status", { replace: true });
    });
  });

  test("Does not render delete data entry button when first entry has errors", () => {
    renderLayout();

    // Verify the delete button is not present
    expect(screen.queryByRole("button", { name: "Invoer verwijderen" })).not.toBeInTheDocument();
  });

  test("Redirect to status page on error DataEntryGetNotAllowed", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "3" });

    overrideOnce("get", "/api/polling_stations/3/data_entries/get", 409, {
      error: "Data entry is in the wrong state",
      fatal: false,
      reference: "DataEntryGetNotAllowed",
    } satisfies ErrorResponse);

    renderLayout();
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/status");
    });
  });
});
