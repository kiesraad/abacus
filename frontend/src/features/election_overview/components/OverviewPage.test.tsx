import { beforeEach, describe, expect, test } from "vitest";

import { ElectionListProvider } from "@/hooks/election/ElectionListProvider";
import { ElectionListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionListResponse } from "@/types/generated/openapi";

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

  test("Shows create button", async () => {
    render(
      <TestUserProvider userRole="administrator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Beheer verkiezingen" })).toBeVisible();
    expect(await screen.findByText("Verkiezing toevoegen")).toBeVisible();
  });

  test("Shows no create button", async () => {
    render(
      <TestUserProvider userRole="coordinator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Beheer verkiezingen" })).toBeVisible();
    expect(screen.queryByText("Verkiezing toevoegen")).not.toBeInTheDocument();
  });
});
