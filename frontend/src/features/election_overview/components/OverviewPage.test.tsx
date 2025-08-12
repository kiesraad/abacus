import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionListProvider } from "@/hooks/election/ElectionListProvider";
import { ElectionListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, renderReturningRouter, screen } from "@/testing/test-utils";
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
    server.use(
      http.get("/api/elections", () =>
        HttpResponse.json(
          {
            committee_sessions: [],
            elections: [],
          } satisfies ElectionListResponse,
          { status: 200 },
        ),
      ),
    );

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

  test("Show no elections message for the administrator", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/elections", () =>
        HttpResponse.json(
          {
            committee_sessions: [],
            elections: [],
          } satisfies ElectionListResponse,
          { status: 200 },
        ),
      ),
    );

    const router = renderReturningRouter(
      <TestUserProvider userRole="administrator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    expect(await screen.findByText(/Nog geen verkiezingen ingesteld/)).toBeVisible();
    expect(
      await screen.findByText(
        /Om Abacus in te richten voor het invoeren van telresulaten, heb je de volgende bestanden nodig:/,
      ),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();

    const button = await screen.findByRole("link", { name: "Verkiezing toevoegen" });
    await user.click(button);

    expect(router.state.location.pathname).toEqual("/create");
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
