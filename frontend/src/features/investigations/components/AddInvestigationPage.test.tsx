import { render as rtlRender, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter, within } from "@/testing/test-utils";

import { investigationRoutes } from "../routes";

async function renderPage() {
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "investigations",
          children: investigationRoutes,
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations/add");
  rtlRender(<Providers router={router} />);

  return router;
}

describe("AddInvestigationPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
  });

  test("Renders the correct headings and table", async () => {
    await renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Onderzoek toevoegen" })).toBeVisible();
    const table = await screen.findByRole("table");

    expect(table).toBeInTheDocument();
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau"],
      ["37", "Dansschool Oeps nou deed ik het weer"],
      ["38", "Testmuseum"],
      ["39", "Test gemeentehuis"],
    ]);
  });

  test("It navigates to add investigation when clicking a table row", async () => {
    const router = await renderPage();

    const row = await screen.findByRole("row", { name: "38 Testmuseum" });
    row.click();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/investigations/6/reason");
    });
  });

  test("Filters out polling stations that already have investigations", async () => {
    await renderPage();

    await screen.findByRole("table");

    // "Op Rolletjes" (polling station 1) should not be visible as it has an existing investigation
    expect(screen.queryByRole("row", { name: "33 Op Rolletjes" })).not.toBeInTheDocument();

    // But other polling stations should still be visible
    expect(await screen.findByRole("row", { name: "38 Testmuseum" })).toBeVisible();
  });

  test("Shows error with link when no polling stations are available to investigate", async () => {
    const electionData = getElectionMockData({}, { id: 2, number: 2, status: "created" });
    electionData.polling_stations = [];
    overrideOnce("get", "/api/elections/1", 200, electionData);

    const router = await renderPage();

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([["Nummer", "Stembureau"], ["Geen stembureaus gevonden"]]);

    const errorAlert = await screen.findByRole("alert");
    expect(within(errorAlert).getByRole("strong")).toHaveTextContent("Geen stembureaus om uit te kiezen");
    expect(within(errorAlert).getByRole("paragraph")).toHaveTextContent(
      ["Je hebt voor alle stembureaus al een onderzoek toegevoegd.", "Je kan niet nog een onderzoek toevoegen."].join(
        "",
      ),
    );
    const backToOverviewLink = await within(errorAlert).findByRole("link");

    backToOverviewLink.click();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/investigations");
    });
  });
});
