import { render as rtlRender, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";

import { AddInvestigationPage } from "./AddInvestigationPage";

async function renderPage() {
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "investigations",
          children: [
            {
              path: "add",
              Component: AddInvestigationPage,
            },
            {
              path: ":pollingStationId",
              children: [
                {
                  index: true,
                  path: "reason",
                  Component: () => "Reason stub",
                },
              ],
            },
          ],
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
      ["40", "Test kerk"],
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
});
