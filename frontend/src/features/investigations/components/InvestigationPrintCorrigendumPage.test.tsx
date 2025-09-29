import * as ReactRouter from "react-router";

import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationInvestigationDeleteHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";

import { investigationRoutes } from "../routes";

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
          children: investigationRoutes,
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations/3/print-corrigendum");
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationPrintCorrigendumPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage,
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
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
        name: ["Download corrigendum voor stembureau 35", "Na 14-2 Bijlage 1"].join(""),
      }),
    ).toBeVisible();

    expect(await screen.findByRole("button", { name: "Verder naar bevindingen" })).toBeVisible();
  });

  test("Navigates to investigation overview when clicking back", async () => {
    const router = await renderPage();

    const backLink = await screen.findByRole("link", { name: "Terug naar alle onderzoeken" });
    backLink.click();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/investigations");
    });
  });

  test("Renders delete button on update investigation and delete works", async () => {
    server.use(PollingStationInvestigationDeleteHandler);
    const user = userEvent.setup();
    await renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Print het corrigendum" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 3, name: "Voer het onderzoek uit" })).toBeVisible();

    const deleteButton = await screen.findByRole("button", { name: "Onderzoek verwijderen" });
    expect(deleteButton).toBeVisible();

    await user.click(deleteButton);

    const modal = await screen.findByTestId("modal-dialog");
    expect(modal).toHaveTextContent("Onderzoek verwijderen?");

    const deleteInvestigation = spyOnHandler(PollingStationInvestigationDeleteHandler);

    const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
    await user.click(confirmButton);

    expect(deleteInvestigation).toHaveBeenCalled();

    expect(pushMessage).toHaveBeenCalledWith({ title: "Onderzoek voor stembureau 35 (Testschool) verwijderd" });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/investigations");
    });
  });
});
