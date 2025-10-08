import * as ReactRouter from "react-router";

import { render as rtlRender, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionStatusChangeRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";
import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { investigationRoutes } from "../routes";

const navigate = vi.fn();

async function renderPage(section: "reason" | "print-corrigendum" | "findings") {
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

  await router.navigate(`/elections/1/investigations/1/${section}`);
  rtlRender(<Providers router={router} />);

  return router;
}

describe("AddInvestigationLayout", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Renders the layout with navigation", async () => {
    await renderPage("reason");

    // Heading
    const banner = await screen.findByRole("banner");
    expect(within(banner).getByText("33")).toBeInTheDocument();
    expect(within(banner).getByRole("heading", { level: 1, name: "Op Rolletjes" })).toBeInTheDocument();

    // Navigation
    const nav = within(screen.getByRole("main")).getByRole("navigation");
    expect(within(nav).getByRole("link", { name: "Aanleiding en opdracht" })).toBeInTheDocument();
    expect(within(nav).getAllByRole("link")).toHaveLength(3);

    // Content
    expect(
      await screen.findByRole("heading", { name: "Aanleiding en opdracht van het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByRole("button", { name: "Opslaan" })).toBeVisible();
  });

  test("Renders warning when data entry is finished", async () => {
    const electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_finished" }, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage("reason");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Invoerfase al afgerond");
    expect(alert).toBeVisible();
  });

  test("Does not render warning when data entry is not finished", async () => {
    const electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_in_progress" }, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    await renderPage("reason");

    // Ensure rendering is complete
    await screen.findByRole("heading", { level: 1, name: electionData.polling_stations[0]!.name });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("Navigation: data entry modal", () => {
    test.each([
      { to: "print-corrigendum", status: "data_entry_not_started", expectShown: false },
      { to: "findings", status: "data_entry_not_started", expectShown: true },
      { to: "findings", status: "data_entry_in_progress", expectShown: false },
    ] satisfies Array<{ to: string; status: CommitteeSessionStatus; expectShown: boolean }>)(
      `When navigating to $to with status $status it should show => $expectShown`,
      async ({ to, status, expectShown }) => {
        const electionData = getElectionMockData({}, { id: 1, number: 1, status }, []);
        overrideOnce("get", "/api/elections/1", 200, electionData);

        const router = await renderPage("reason");
        await router.navigate(`../${to}`);

        if (!expectShown) {
          expect(screen.queryByTestId("modal-dialog")).toBeNull();
          return;
        }

        const modal = await screen.findByTestId("modal-dialog");
        expect(modal).toHaveTextContent("Invoerfase starten?");
      },
    );

    test("When immediately navigating to findings with status=data_entry_not_started should show the modal", async () => {
      const electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_not_started" }, []);
      overrideOnce("get", "/api/elections/1", 200, electionData);

      await renderPage("findings");

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Invoerfase starten?");
    });

    test("When immediately navigating to findings with status=data_entry_in_progress should not show the modal", async () => {
      const electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_in_progress" }, []);
      overrideOnce("get", "/api/elections/1", 200, electionData);

      await renderPage("findings");

      expect(screen.queryByTestId("modal-dialog")).toBeNull();
    });

    test("When pressing cancel on findings sections, return to print-corrigendum", async () => {
      server.use(CommitteeSessionStatusChangeRequestHandler);
      const updateCommitteeSession = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

      const electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_not_started" }, []);
      overrideOnce("get", "/api/elections/1", 200, electionData);

      await renderPage("findings");

      const user = userEvent.setup();
      const modal = await screen.findByTestId("modal-dialog");
      const modalNav = within(modal).getByRole("navigation");
      const cancelButton = await within(modalNav).findByRole("button", { name: "Annuleren" });
      await user.click(cancelButton);

      expect(updateCommitteeSession).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledExactlyOnceWith("../1/print-corrigendum");
      expect(modal).not.toBeInTheDocument();
    });

    test("When pressing cancel on other section, don't navigate away", async () => {
      server.use(CommitteeSessionStatusChangeRequestHandler);
      const updateCommitteeSession = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

      const electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_not_started" }, []);
      overrideOnce("get", "/api/elections/1", 200, electionData);

      await renderPage("print-corrigendum");
      const user = userEvent.setup();
      const continueButton = await screen.findByRole("link", { name: "Verder naar bevindingen" });
      await user.click(continueButton);

      const modal = await screen.findByTestId("modal-dialog");
      const modalNav = within(modal).getByRole("navigation");
      const cancelButton = await within(modalNav).findByRole("button", { name: "Annuleren" });
      await user.click(cancelButton);

      expect(updateCommitteeSession).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(modal).not.toBeInTheDocument();
    });

    test("When pressing continue, navigate to findings", async () => {
      server.use(CommitteeSessionStatusChangeRequestHandler);
      const updateCommitteeSession = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

      let electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_not_started" }, []);
      overrideOnce("get", "/api/elections/1", 200, electionData);

      await renderPage("print-corrigendum");
      const user = userEvent.setup();
      const continueButton = await screen.findByRole("link", { name: "Verder naar bevindingen" });
      await user.click(continueButton);

      // Change status to data_entry_in_progress to simulate the backend change
      electionData = getElectionMockData({}, { id: 1, number: 1, status: "data_entry_in_progress" }, []);
      overrideOnce("get", "/api/elections/1", 200, electionData);

      const modal = await screen.findByTestId("modal-dialog");
      const confirmButton = await within(modal).findByRole("button", { name: "Invoerfase starten" });
      await user.click(confirmButton);

      expect(updateCommitteeSession).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledExactlyOnceWith("./findings");

      await waitFor(() => {
        expect(modal).not.toBeInTheDocument();
      });
    });
  });
});
