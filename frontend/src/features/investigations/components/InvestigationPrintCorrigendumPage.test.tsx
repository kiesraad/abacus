import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import * as ReactRouter from "react-router";
import { RouterProvider } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import * as useMessages from "@/hooks/messages/useMessages";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationInvestigationDeleteHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, type Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";
import type { Role } from "@/types/generated/openapi";
import { investigationRoutes } from "../routes";

const navigate = vi.fn();
const pushMessage = vi.fn();

const Providers = ({
  children,
  router = getRouter(children),
  userRole,
  fetchInitialUser = false,
}: {
  children?: ReactNode;
  router?: Router;
  userRole: Role;
  fetchInitialUser?: boolean;
}) => {
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <TestUserProvider userRole={userRole}>
        <RouterProvider router={router} />
      </TestUserProvider>
    </ApiProvider>
  );
};

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
  render(<Providers router={router} userRole="coordinator_gsb" />);

  return router;
}

describe("InvestigationPrintCorrigendumPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2 }));
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage,
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
  });

  describe("CSO", () => {
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
      expect(await screen.findByRole("link", { name: "Verder naar bevindingen" })).toBeVisible();
    });
  });

  describe("DSO", () => {
    test("Renders the correct headers and a download button", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({ counting_method: "DSO" }, { number: 2 }));

      await renderPage();

      expect(await screen.findByRole("heading", { level: 2, name: "Print het corrigendum" })).toBeVisible();
      expect(await screen.findByRole("heading", { level: 3, name: "Voer het onderzoek uit" })).toBeVisible();
      expect(
        await screen.findByRole("heading", { level: 3, name: "Na het onderzoek van het gemeentelijk stembureau" }),
      ).toBeVisible();

      expect(
        await screen.findByRole("link", {
          name: ["Download corrigendum voor stembureau 35", "Na 14-1, versie 2"].join(""),
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: "Verder naar bevindingen" })).toBeVisible();
    });

    test("Shows modal on clicking download corrigendum when committee session details missing", async () => {
      const user = userEvent.setup();
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({ counting_method: "DSO" }, { number: 2 }));

      await renderPage();

      expect(await screen.findByRole("heading", { level: 2, name: "Print het corrigendum" })).toBeVisible();
      expect(await screen.findByRole("heading", { level: 3, name: "Voer het onderzoek uit" })).toBeVisible();
      expect(
        await screen.findByRole("heading", { level: 3, name: "Na het onderzoek van het gemeentelijk stembureau" }),
      ).toBeVisible();

      const link = await screen.findByRole("link", {
        name: ["Download corrigendum voor stembureau 35", "Na 14-1, versie 2"].join(""),
      });
      expect(link).toBeVisible();
      await user.click(link);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Vul eerst de details van de zitting in");
      expect(title).toBeVisible();

      const enter_details_button = within(modal).getByRole("button", { name: "Details invullen" });
      expect(enter_details_button).toBeVisible();
      await user.click(enter_details_button);

      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/details");
    });

    test("Does not show modal on clicking download corrigendum when committee session details present", async () => {
      const user = userEvent.setup();
      overrideOnce(
        "get",
        "/api/elections/1",
        200,
        getElectionMockData(
          { counting_method: "DSO" },
          { number: 2, location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
        ),
      );

      await renderPage();

      expect(await screen.findByRole("heading", { level: 2, name: "Print het corrigendum" })).toBeVisible();
      expect(await screen.findByRole("heading", { level: 3, name: "Voer het onderzoek uit" })).toBeVisible();
      expect(
        await screen.findByRole("heading", { level: 3, name: "Na het onderzoek van het gemeentelijk stembureau" }),
      ).toBeVisible();

      const link = await screen.findByRole("link", {
        name: ["Download corrigendum voor stembureau 35", "Na 14-1, versie 2"].join(""),
      });
      expect(link).toBeVisible();
      await user.click(link);
      await screen.findByRole("link", { name: "Terug naar alle onderzoeken" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("Navigates to investigation overview when clicking back", async () => {
    const router = await renderPage();

    const backLink = await screen.findByRole("link", { name: "Terug naar alle onderzoeken" });
    backLink.click();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/investigations");
    });
  });

  test("Returns to list page with a success message when clicking delete investigation", async () => {
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
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/investigations", { replace: true });
    });
  });

  test("Returns to list page with a warning message when clicking delete investigation when data entry completed", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2, status: "completed" }));
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

    expect(pushMessage).toHaveBeenCalledWith({
      type: "warning",
      title: "Maak een nieuw proces-verbaal voor deze zitting",
      text: "Onderzoek voor stembureau 35 (Testschool) verwijderd. De eerder gemaakte documenten van deze zitting zijn daardoor niet meer geldig. Maak een nieuw proces-verbaal door de invoerfase opnieuw af te ronden.",
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/investigations", { replace: true });
    });
  });
});
