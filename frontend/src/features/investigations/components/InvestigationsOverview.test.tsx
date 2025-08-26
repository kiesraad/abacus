import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";

import { InvestigationsOverview } from "./InvestigationsOverview";

async function renderPage() {
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "investigations",
          Component: InvestigationsOverview,
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations");
  rtlRender(<Providers router={router} />);

  return router;
}

describe("InvestigationsOverview", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
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
