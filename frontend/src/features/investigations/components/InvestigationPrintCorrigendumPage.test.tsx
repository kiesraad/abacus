import * as ReactRouter from "react-router";

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";

import { AddInvestigationLayout } from "./AddInvestigationLayout";
import { InvestigationPrintCorrigendumPage } from "./InvestigationPrintCorrigendumPage";

const navigate = vi.fn();
const pushMessage = vi.fn();

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
              index: true,
              Component: () => "Overview stub",
            },
            {
              path: ":pollingStationId",
              Component: AddInvestigationLayout,
              children: [
                {
                  index: true,
                  path: "reason",
                  Component: () => "Reason stub",
                },
                {
                  path: "print-corrigendum",
                  Component: InvestigationPrintCorrigendumPage,
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations/1/print-corrigendum");
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationPrintCorrigendumPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage, popMessages: vi.fn(() => []) });
  });

  test("Renders the correct headers and a download button", async () => {
    await renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Print het corrigendum" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 3, name: "Voer het onderzoek uit" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 3, name: "Na het onderzoek van het gemeentelijk stembureau" }),
    ).toBeVisible();

    expect(
      await screen.findByRole("link", {
        name: ["Download corrigendum voor stembureau 33", "Na 14-2 Bijlage 1"].join(""),
      }),
    ).toBeVisible();

    expect(await screen.findByRole("link", { name: "Verder naar bevindingen" })).toBeVisible();
  });

  test("Navigates to investigation overview when clicking back", async () => {
    const router = await renderPage();

    const backLink = await screen.findByRole("link", { name: "Terug naar alle onderzoeken" });
    backLink.click();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/investigations");
    });
  });
});
