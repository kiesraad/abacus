import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionListProvider, ElectionListResponse } from "@kiesraad/api";
import { ElectionListRequestHandler } from "@kiesraad/api-mocks";
import { overrideOnce, render, server } from "@kiesraad/test";

import { OverviewPage } from "./OverviewPage";

describe("OverviewPage", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
  });

  test("Show elections", async () => {
    render(
      <ElectionListProvider>
        <OverviewPage />
      </ElectionListProvider>,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Verkiezing", "Gebied", "Status", ""],
      ["Gemeenteraadsverkiezingen 2026", "Heemdamseburg", "Steminvoer bezig", ""],
    ]);
  });

  test("Show no elections message", async () => {
    overrideOnce("get", "/api/elections", 200, {
      elections: [],
    } satisfies ElectionListResponse);

    render(
      <ElectionListProvider>
        <OverviewPage />
      </ElectionListProvider>,
    );

    expect(await screen.findByText(/Nog geen verkiezingen ingesteld/)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
