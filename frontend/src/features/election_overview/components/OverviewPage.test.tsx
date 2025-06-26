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
      ["Gemeenteraadsverkiezingen 2026", "Heemdamseburg", "Je kan invoeren"],
    ]);
  });

  test("Show no elections message", async () => {
    overrideOnce("get", "/api/elections", 200, {
      committee_sessions: [],
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

  test("Shows create election link", async () => {
    render(
      <TestUserProvider userRole="administrator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Beheer verkiezingen" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Verkiezing toevoegen" })).toBeVisible();
  });

  test("Does not show create election link", async () => {
    render(
      <TestUserProvider userRole="coordinator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Beheer verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Verkiezing toevoegen" })).not.toBeInTheDocument();
  });
});
