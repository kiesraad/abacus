import { render as rtlRender } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";
import { ElectionDetailsResponse } from "@/types/generated/openapi";

import { InvestigationsOverviewPage } from "./InvestigationsOverviewPage.tsx";

async function renderPage() {
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "investigations",
          Component: InvestigationsOverviewPage,
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations");
  rtlRender(<Providers router={router} />);

  return router;
}

describe("InvestigationsOverviewPage", () => {
  beforeEach(() => {
    server.use(ElectionStatusRequestHandler);
    const electionData = getElectionMockData({}, { id: 2, number: 2, status: "created" });
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
  });

  test("Renders the correct headings and button", async () => {
    await renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Onderzoeken in tweede zitting" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Onderzoeksverzoeken vanuit het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByRole("link", { name: "Onderzoek toevoegen" })).toBeVisible();
  });

  test("Navigates to the polling station list when clicking the button", async () => {
    const router = await renderPage();

    const link = await screen.findByRole("link", { name: "Onderzoek toevoegen" });
    link.click();

    expect(router.state.location.pathname).toEqual("/elections/1/investigations/add");
  });
});
