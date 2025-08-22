import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionListProvider } from "@/hooks/election/ElectionListProvider";
import { ElectionListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, renderReturningRouter, screen, spyOnHandler, waitFor } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionListResponse } from "@/types/generated/openapi";

import { OverviewPage } from "./OverviewPage";

const navigate = vi.fn();

describe("OverviewPage", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
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
    const tableRows = within(table).queryAllByRole("row");
    expect(tableRows[0]).toHaveTextContent(["Verkiezing", "Gebied", "Status"].join(""));
    const firstRow = tableRows[1]!;
    expect(firstRow).toHaveTextContent(["Gemeenteraadsverkiezingen 2026", "Heemdamseburg", "Je kan invoeren"].join(""));
    await user.click(firstRow);

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
    const tableRows = within(table).queryAllByRole("row");
    expect(tableRows[0]).toHaveTextContent(["Verkiezing", "Niveau stembureau", "Status"].join(""));
    const firstRow = tableRows[1]!;
    expect(firstRow).toHaveTextContent(["Gemeenteraadsverkiezingen 2026", "", "Steminvoer bezig"].join(""));
    await user.click(firstRow);

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
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezingen beheren" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Verkiezing toevoegen" })).toBeVisible();

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    const tableRows = within(table).queryAllByRole("row");
    expect(tableRows[0]).toHaveTextContent(["Verkiezing", "Niveau stembureau", "Status"].join(""));
    const firstRow = tableRows[1]!;
    expect(firstRow).toHaveTextContent(["Gemeenteraadsverkiezingen 2026", "", "Steminvoer bezig"].join(""));
    await user.click(firstRow);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1");
    });
  });

  test("Shows no elections message for typist", async () => {
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
      <TestUserProvider userRole="typist">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Verkiezing toevoegen" })).not.toBeInTheDocument();

    expect(await screen.findByText(/Abacus is nog niet klaar voor gebruik/)).toBeVisible();
    expect(await screen.findByText(/De configuratie van Abacus is nog niet afgerond./)).toBeVisible();
    expect(await screen.findByText(/Je kan nog geen telresultaten invoeren./)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Shows no elections message for coordinator", async () => {
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
      <TestUserProvider userRole="coordinator">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Verkiezing toevoegen" })).not.toBeInTheDocument();

    expect(await screen.findByText(/Abacus is nog niet klaar voor gebruik/)).toBeVisible();
    expect(await screen.findByText(/De configuratie van Abacus is nog niet afgerond./)).toBeVisible();
    expect(screen.queryByText(/Je kan nog geen telresultaten invoeren./)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Shows no elections message for the administrator", async () => {
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

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezingen beheren" })).toBeVisible();

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

  test("Refetches data every 30 seconds", async () => {
    vi.useFakeTimers();
    render(
      <TestUserProvider userRole="typist">
        <ElectionListProvider>
          <OverviewPage />
        </ElectionListProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Verkiezingen" })).toBeVisible();
    });

    const electionListRequestSpy = spyOnHandler(ElectionListRequestHandler);

    // Test 3 intervals of 30 seconds each
    for (let i = 1; i <= 3; i++) {
      vi.advanceTimersByTime(30_000);

      await vi.waitFor(() => {
        expect(electionListRequestSpy).toHaveBeenCalledTimes(i);
      });
    }

    vi.useRealTimers();
  });
});
