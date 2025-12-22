import * as ReactRouter from "react-router";

import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationInvestigationCreateHandler,
  PollingStationInvestigationDeleteHandler,
  PollingStationInvestigationUpdateHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";

import { investigationRoutes } from "../routes";

const navigate = vi.fn();
const pushMessage = vi.fn();

async function renderPage(pollingStationId: number) {
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

  await router.navigate(`/elections/1/investigations/${pollingStationId}/reason`);
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationReasonPage", () => {
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

  test("Renders a form", async () => {
    await renderPage(3);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aanleiding en opdracht van het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByRole("textbox", { name: "Aanleiding en opdracht" })).toBeVisible();
  });

  test("Displays an error message when submitting an empty form", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2 }, []));

    await renderPage(3);

    const reason = await screen.findByRole("textbox", { name: "Aanleiding en opdracht" });
    const submitButton = await screen.findByRole("button", { name: "Volgende" });

    submitButton.click();

    await waitFor(() => {
      expect(reason).toBeInvalid();
    });

    expect(reason).toHaveAccessibleErrorMessage("Vul de opdracht van het centraal stembureau in");
  });

  test("Navigate to the next page when submitting a reason", async () => {
    server.use(PollingStationInvestigationCreateHandler);
    const create = spyOnHandler(PollingStationInvestigationCreateHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2 }, []));

    await renderPage(3);

    const reason = await screen.findByRole("textbox", { name: "Aanleiding en opdracht" });
    const submitButton = await screen.findByRole("button", { name: "Volgende" });

    const user = userEvent.setup();
    await user.type(reason, "Reden voor onderzoek");
    await user.click(submitButton);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../print-corrigendum");
    });
    expect(create).toHaveBeenCalledWith({
      reason: "Reden voor onderzoek",
    });
    expect(pushMessage).toHaveBeenCalledWith({ title: "Onderzoek voor stembureau 35 (Testschool) toegevoegd" });
  });

  test("Navigate to the next page when submitting a reason when data entry finished", async () => {
    server.use(PollingStationInvestigationCreateHandler);
    const create = spyOnHandler(PollingStationInvestigationCreateHandler);
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData({}, { number: 2, status: "data_entry_finished" }, []),
    );

    await renderPage(3);

    const reason = await screen.findByLabelText("Aanleiding en opdracht");
    const submitButton = await screen.findByRole("button", { name: "Volgende" });

    const user = userEvent.setup();
    await user.type(reason, "Reden voor onderzoek");
    await user.click(submitButton);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../print-corrigendum");
    });
    expect(create).toHaveBeenCalledWith({
      reason: "Reden voor onderzoek",
    });
    expect(pushMessage).toHaveBeenCalledWith({
      type: "warning",
      title: "Maak een nieuw proces-verbaal voor deze zitting",
      text: "Onderzoek voor stembureau 35 (Testschool) toegevoegd. De eerder gemaakte documenten van deze zitting zijn daardoor niet meer geldig. Maak een nieuw proces-verbaal door de invoerfase opnieuw af te ronden.",
    });
  });

  test("Update the existing reason", async () => {
    server.use(PollingStationInvestigationUpdateHandler);
    const update = spyOnHandler(PollingStationInvestigationUpdateHandler);

    await renderPage(3);

    const reason = await screen.findByRole("textbox", { name: "Aanleiding en opdracht" });
    expect(reason).toHaveValue("Test reason 1");

    const user = userEvent.setup();
    await user.clear(reason);
    await user.type(reason, "New test reason 1");

    expect(reason).toHaveValue("New test reason 1");

    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../print-corrigendum");
    });
    expect(update).toHaveBeenCalledWith({
      reason: "New test reason 1",
    });
    expect(pushMessage).toHaveBeenCalledWith({
      title: "Onderzoek voor stembureau 35 (Testschool) aangepast",
    });
  });

  test("Navigates on save with a warning message when data entry finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2, status: "data_entry_finished" }));
    server.use(PollingStationInvestigationUpdateHandler);
    const update = spyOnHandler(PollingStationInvestigationUpdateHandler);

    await renderPage(3);

    const reason = await screen.findByLabelText("Aanleiding en opdracht");
    expect(reason).toHaveValue("Test reason 1");

    const user = userEvent.setup();
    await user.clear(reason);
    await user.type(reason, "New test reason 1");

    expect(reason).toHaveValue("New test reason 1");

    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../print-corrigendum");
    });
    expect(update).toHaveBeenCalledWith({
      reason: "New test reason 1",
    });
    expect(pushMessage).toHaveBeenCalledWith({
      type: "warning",
      title: "Maak een nieuw proces-verbaal voor deze zitting",
      text: "Onderzoek voor stembureau 35 (Testschool) aangepast. De eerder gemaakte documenten van deze zitting zijn daardoor niet meer geldig. Maak een nieuw proces-verbaal door de invoerfase opnieuw af te ronden.",
    });
  });

  test("Does not render delete button on create investigation", async () => {
    await renderPage(5);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aanleiding en opdracht van het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByRole("textbox", { name: "Aanleiding en opdracht" })).toBeVisible();

    expect(screen.queryByRole("link", { name: "Verwijder onderzoek" })).not.toBeInTheDocument();
  });

  test("Returns to list page with a success message when clicking delete investigation", async () => {
    server.use(PollingStationInvestigationDeleteHandler);
    const user = userEvent.setup();
    await renderPage(3);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aanleiding en opdracht van het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByRole("textbox", { name: "Aanleiding en opdracht" })).toBeVisible();

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

  test("Returns to list page with a warning message when clicking delete investigation when data entry finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2, status: "data_entry_finished" }));
    server.use(PollingStationInvestigationDeleteHandler);
    const user = userEvent.setup();
    await renderPage(3);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aanleiding en opdracht van het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Aanleiding en opdracht")).toBeVisible();

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
