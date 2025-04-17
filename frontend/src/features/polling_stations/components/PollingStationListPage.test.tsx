import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionRequestHandler, PollingStationListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { PollingStationListResponse } from "@/types/generated/openapi";

import { PollingStationListPage } from "./PollingStationListPage";

describe("PollingStationListPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationListRequestHandler);
  });

  test("Show polling stations", async () => {
    render(
      <ElectionProvider electionId={1}>
        <PollingStationListPage />
      </ElectionProvider>,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Naam", "Soort"],
      ["33", "Op Rolletjes", "Mobiel"],
      ["34", "Testplek", "Bijzonder"],
      ["35", "Testschool", "Vaste locatie"],
      ["36", "Testbuurthuis", "Vaste locatie"],
    ]);
  });

  test("Show no polling stations message", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, {
      polling_stations: [],
    } satisfies PollingStationListResponse);

    render(
      <ElectionProvider electionId={1}>
        <PollingStationListPage />
      </ElectionProvider>,
    );

    expect(await screen.findByText(/Er zijn nog geen stembureaus ingevoerd/)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
