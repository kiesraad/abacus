import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, within } from "@/testing/test-utils";

import { PollingStationCreatePage } from "./PollingStationCreatePage";

async function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <PollingStationCreatePage />
    </ElectionProvider>,
  );

  // Ensure rendering is complete
  const form = await screen.findByTestId("polling-station-form");
  expect(form).toBeVisible();
}

describe("PollingStationCreatePage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
  });

  test("Shows form", async () => {
    await renderPage();
  });

  test("Renders warning when data entry is finished", async () => {
    const electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_finished" }, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);
    await renderPage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Invoerfase al afgerond");
    expect(alert).toBeVisible();
  });

  test("Does not render warning when data entry is not finished", async () => {
    await renderPage();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
