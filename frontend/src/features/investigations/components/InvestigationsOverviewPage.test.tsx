import { ReactNode } from "react";
import { RouterProvider } from "react-router";

import { render as rtlRender, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionStatusChangeRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter, spyOnHandler } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionDetailsResponse, Role } from "@/types/generated/openapi";

import { investigationRoutes } from "../routes";

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

async function renderPage(userRole: Role) {
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

  await router.navigate("/elections/1/investigations");
  rtlRender(<Providers router={router} userRole={userRole} />);

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
    const electionData = getElectionMockData({}, { id: 1, number: 2, status: "created" }, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage("coordinator");

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
    const router = await renderPage("coordinator");

    const link = await screen.findByRole("link", { name: "Onderzoek toevoegen" });
    link.click();

    expect(router.state.location.pathname).toEqual("/elections/1/investigations/add");
  });

  test("Renders and filters a list of investigations in two categories", async () => {
    await renderPage("coordinator");

    // assert the investigations count + one "Afgehandelde onderzoeken" heading
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

  test("Shows finish data entry message when all investigations are handled and session status != finished", async () => {
    const electionData = getElectionMockData({}, { id: 1, number: 2, status: "data_entry_in_progress" }, [
      {
        polling_station_id: 1,
        reason: "Test reason 1",
        findings: "Test findings 1",
        corrected_results: false,
      },
    ]);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage("coordinator");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Alle onderzoeken zijn afgehandeld");
    expect(within(alert).getByRole("paragraph")).toHaveTextContent(
      "De resultaten van alle onderzoeken zijn ingevoerd. Je kunt de uitslag nu definitief maken en het proces verbaal opmaken.",
    );
    expect(within(alert).getByRole("button", { name: "Invoerfase afronden" })).toBeVisible();
  });

  test("Doesn't show finish data entry message when all investigations are handled and session status = finished", async () => {
    server.use(CommitteeSessionStatusChangeRequestHandler);
    const electionData = getElectionMockData({}, { id: 1, number: 2, status: "data_entry_finished" }, [
      {
        polling_station_id: 1,
        reason: "Test reason 1",
        findings: "Test findings 1",
        corrected_results: false,
      },
    ]);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage("coordinator");
    // Ensure rendering is complete
    await screen.findAllByRole("heading", { level: 1 });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("Updates status when finish data entry is clicked", async () => {
    server.use(CommitteeSessionStatusChangeRequestHandler);
    const updateCommitteeSession = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

    const electionData = getElectionMockData({}, { id: 1, number: 2, status: "data_entry_in_progress" }, [
      {
        polling_station_id: 1,
        reason: "Test reason 1",
        findings: "Test findings 1",
        corrected_results: false,
      },
    ]);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage("coordinator");

    const finishButton = await screen.findByRole("button", { name: "Invoerfase afronden" });
    expect(finishButton).toBeVisible();
    finishButton.click();

    await waitFor(() => {
      expect(updateCommitteeSession).toHaveBeenCalledExactlyOnceWith({
        status: "data_entry_finished",
      });
    });
  });

  test("Shows start data entry modal when clicking fill findings button", async () => {
    server.use(CommitteeSessionStatusChangeRequestHandler);

    const electionData = getElectionMockData({}, { id: 1, number: 2, status: "data_entry_not_started" }, [
      {
        polling_station_id: 1,
        reason: "Test reason 1",
      },
    ]);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage("coordinator");

    const fillInLink = await screen.findByRole("button", { name: "Nu invullen" });
    expect(fillInLink).toBeInTheDocument();
    fillInLink.click();

    const modal = await screen.findByTestId("modal-dialog");
    expect(modal).toHaveTextContent("Invoerfase starten?");

    const updateCommitteeSession = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

    const user = userEvent.setup();
    const confirmButton = await within(modal).findByRole("button", { name: "Invoerfase starten" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(updateCommitteeSession).toHaveBeenCalledExactlyOnceWith({
        status: "data_entry_in_progress",
      });
    });
  });

  test("Links to the correct pages when editing an investigation or printing the corrigendum", async () => {
    await renderPage("coordinator");

    const printLink = await screen.findByRole("link", { name: "Corrigendum afdrukken" });
    expect(printLink).toHaveAttribute("href", "/elections/1/investigations/3/print-corrigendum");

    const fillInLink = await screen.findByRole("button", { name: "Nu invullen" });
    expect(fillInLink).toBeInTheDocument();

    const editLinks = await screen.findAllByRole("link", { name: "Bewerken" });

    expect(editLinks[0]).toHaveAttribute("href", "/elections/1/investigations/1/findings");
    expect(editLinks[1]).toHaveAttribute("href", "/elections/1/investigations/4/findings");
    expect(editLinks[2]).toHaveAttribute("href", "/elections/1/investigations/2/findings");
    expect(editLinks[3]).toHaveAttribute("href", "/elections/1/investigations/8/findings");
  });

  test("Does not show add and edit links to administrator", async () => {
    await renderPage("administrator");

    // Ensure rendering is complete
    await screen.findAllByRole("heading", { level: 1 });

    expect(screen.queryByRole("link", { name: "Onderzoek toevoegen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Corrigendum afdrukken" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nu invullen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bewerken" })).not.toBeInTheDocument();
  });
});
