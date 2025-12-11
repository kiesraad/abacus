import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event/dist/cjs/index.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationCreateHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";

import { PollingStationCreatePage } from "./PollingStationCreatePage";

const navigate = vi.fn();

function renderPage() {
  return render(
    <ElectionProvider electionId={1}>
      <PollingStationCreatePage />
    </ElectionProvider>,
  );
}

describe("PollingStationCreatePage", () => {
  const pushMessage = vi.fn();

  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationCreateHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1" });
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage,
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
  });

  test("Shows form", async () => {
    renderPage();

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nummer" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Naam" })).toBeVisible();
  });

  test("Navigates back on save with a success message", async () => {
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();
    const numberInput = screen.getByRole("textbox", { name: "Nummer" });
    const nameInput = screen.getByRole("textbox", { name: "Naam" });
    await user.type(numberInput, "21");
    await user.type(nameInput, "New Polling Station");
    const saveButton = await screen.findByRole("button", { name: "Opslaan en toevoegen" });
    saveButton.click();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({ title: "Stembureau 34 (Testplek) toegevoegd" });
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations");
    });
  });

  test("Navigates back on save with a warning message when data entry finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();
    const numberInput = screen.getByRole("textbox", { name: "Nummer" });
    const nameInput = screen.getByRole("textbox", { name: "Naam" });
    await user.type(numberInput, "21");
    await user.type(nameInput, "New Polling Station");
    const saveButton = await screen.findByRole("button", { name: "Opslaan en toevoegen" });
    saveButton.click();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Maak een nieuw proces-verbaal voor deze zitting",
        text: "Stembureau 34 (Testplek) toegevoegd. De eerder gemaakte documenten van deze zitting zijn daardoor niet meer geldig. Maak een nieuw proces-verbaal door de invoerfase opnieuw af te ronden.",
      });
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations");
    });
  });
});
