import { render as rtlRender } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";
import { ElectionDetailsResponse } from "@/types/generated/openapi";

import { InvestigationsOverviewPage } from "./InvestigationsOverviewPage";

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
    const electionData = getElectionMockData({}, { id: 2, number: 2, status: "created" }, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Onderzoeken in tweede zitting" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Onderzoeksverzoeken vanuit het centraal stembureau" }),
    ).toBeVisible();

    expect(
      await screen.findByText(
        "Voeg voor elk verzoek van het centraal stembureau een onderzoek toe en voer de aanleiding in.",
      ),
    ).toBeVisible();

    expect(await screen.findByRole("link", { name: "Onderzoek toevoegen" })).toBeVisible();
  });

  test("Navigates to the polling station list when clicking the button", async () => {
    const router = await renderPage();

    const link = await screen.findByRole("link", { name: "Onderzoek toevoegen" });
    link.click();

    expect(router.state.location.pathname).toEqual("/elections/1/investigations/add");
  });

  test("Renders and filters a list of investigations in two categories", async () => {
    await renderPage();

    // count that there are 4 investigations + the "Afgehandelde onderzoeken" heading
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(6);

    // check the order and the filtering
    const headings = await screen.findAllByRole("heading", { level: 3 });

    expect(headings[0]).toHaveTextContent("Testschool");
    expect(headings[1]).toHaveTextContent("Op Rolletjes");
    expect(headings[2]).toHaveTextContent("Testbuurthuis");
    expect(headings[3]).toHaveTextContent("Afgehandelde onderzoeken");
    expect(headings[4]).toHaveTextContent("Testplek");
    expect(headings[5]).toHaveTextContent("Test kerk");
  });

  test("Links to the correct pages when editing an investigation or printing the corrigendum", async () => {
    await renderPage();

    const printLink = await screen.findByRole("link", { name: "Corrigendum afdrukken" });
    expect(printLink).toHaveAttribute("href", "/elections/1/investigations/3/print-corrigendum");

    const fillInLink = await screen.findByRole("link", { name: "Nu invullen" });
    expect(fillInLink).toHaveAttribute("href", "/elections/1/investigations/3/findings");

    const editLinks = await screen.findAllByRole("link", { name: "Bewerken" });

    expect(editLinks[0]).toHaveAttribute("href", "/elections/1/investigations/1/findings");
    expect(editLinks[1]).toHaveAttribute("href", "/elections/1/investigations/4/findings");
    expect(editLinks[2]).toHaveAttribute("href", "/elections/1/investigations/2/findings");
    expect(editLinks[3]).toHaveAttribute("href", "/elections/1/investigations/8/findings");
  });
});
