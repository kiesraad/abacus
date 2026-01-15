import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, within } from "@/testing/test-utils";

import { PollingStationAlert } from "./PollingStationAlert";

async function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <div id="content">
        <PollingStationAlert />
      </div>
    </ElectionProvider>,
  );

  // Ensure rendering is complete
  expect(await screen.findByTestId("content")).toBeVisible();
}

describe("PollingStationAlert", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test("Renders warning when data entry is finished", async () => {
    const electionData = getElectionMockData({}, { id: 1, number: 1, status: "completed" }, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);
    await renderPage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Invoerfase al afgerond");
  });

  test("Does not render warning when data entry is not finished", async () => {
    await renderPage();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
