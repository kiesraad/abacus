import { userEvent } from "@testing-library/user-event";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionListProvider } from "@/hooks/election/ElectionListProvider";
import { ElectionListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, renderReturningRouter, screen, waitFor } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionListResponse } from "@/types/generated/openapi";

import { OverviewPage } from "./OverviewPage";

const navigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe("OverviewPage", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
  });

  test("Renders elections for typist", async () => {
    const user = userEvent.setup();
    render(
      <TestUserProvider userRole="typist">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Verkiezing toevoegen" })).not.toBeInTheDocument();

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Verkiezing", "Gebied", "Status"],
      ["Gemeenteraadsverkiezingen 2026", "Heemdamseburg", "Je kan invoeren"],
    ]);

    const tableRows = within(table).queryAllByRole("row");
    await user.click(tableRows[1]!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/data-entry");
    });
  });

  test("Renders elections and does not show create election link for coordinator", async () => {
    const user = userEvent.setup();
    render(
      <TestUserProvider userRole="coordinator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Verkiezing toevoegen" })).not.toBeInTheDocument();

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Verkiezing", "Niveau stembureau", "Status"],
      ["Gemeenteraadsverkiezingen 2026", "", "Steminvoer bezig"],
    ]);

    const tableRows = within(table).queryAllByRole("row");
    await user.click(tableRows[1]!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1");
    });
  });

  test("Renders elections and create election link for administrator", async () => {
    const user = userEvent.setup();
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

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Verkiezing", "Niveau stembureau", "Status"],
      ["Gemeenteraadsverkiezingen 2026", "", "Steminvoer bezig"],
    ]);

    const tableRows = within(table).queryAllByRole("row");
    await user.click(tableRows[1]!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1");
    });
  });

  test("Shows no elections message for typist", async () => {
    overrideOnce("get", "/api/elections", 200, {
      committee_sessions: [],
      elections: [],
    } satisfies ElectionListResponse);

    render(
      <TestUserProvider userRole="typist">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    expect(await screen.findByText(/Abacus is nog niet klaar voor gebruik/)).toBeVisible();
    expect(await screen.findByText(/De configuratie van Abacus is nog niet afgerond./)).toBeVisible();
    expect(await screen.findByText(/Je kan nog geen telresultaten invoeren./)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Shows no elections message for coordinator", async () => {
    overrideOnce("get", "/api/elections", 200, {
      committee_sessions: [],
      elections: [],
    } satisfies ElectionListResponse);

    render(
      <TestUserProvider userRole="coordinator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    expect(await screen.findByText(/Abacus is nog niet klaar voor gebruik/)).toBeVisible();
    expect(await screen.findByText(/De configuratie van Abacus is nog niet afgerond./)).toBeVisible();
    expect(screen.queryByText(/Je kan nog geen telresultaten invoeren./)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Shows no elections message for the administrator", async () => {
    const user = userEvent.setup();
    overrideOnce("get", "/api/elections", 200, {
      committee_sessions: [],
      elections: [],
    } satisfies ElectionListResponse);

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
});
