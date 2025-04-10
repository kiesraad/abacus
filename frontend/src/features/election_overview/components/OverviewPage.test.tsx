import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionListResponse } from "@/api";
import { overrideOnce, render, server } from "@/testing";
import { ElectionListRequestHandler } from "@/testing/api-mocks/RequestHandlers";

import { ElectionListProvider } from "../hooks/ElectionListProvider";
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
      ["Verkiezing", "Gebied", "Status"],
      ["Gemeenteraadsverkiezingen 2026", "Heemdamseburg", "Steminvoer bezig"],
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

    expect(await screen.findByText(/Abacus is nog niet klaar voor gebruik/)).toBeVisible();
    expect(
      await screen.findByText(
        /Je kan als invoerder nog niks doen. Wacht tot de coördinator het systeem openstelt voor het invoeren van telresultaten./,
      ),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
