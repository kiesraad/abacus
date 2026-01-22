import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import * as useMessages from "@/hooks/messages/useMessages";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationInvestigationConcludeHandler,
  PollingStationInvestigationDeleteHandler,
  PollingStationInvestigationUpdateHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";
import type { ErrorResponse, PollingStationInvestigation } from "@/types/generated/openapi";

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

  await router.navigate(`/elections/1/investigations/${pollingStationId}/findings`);
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationFindingsPage", () => {
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
      await screen.findByRole("heading", {
        level: 2,
        name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
      }),
    ).toBeVisible();
    expect(await screen.findByRole("textbox", { name: "Bevindingen" })).toBeVisible();
  });

  test("Displays an error message when submitting an empty form", async () => {
    await renderPage(3);

    const findings = await screen.findByRole("textbox", { name: "Bevindingen" });
    const submitButton = await screen.findByRole("button", { name: "Opslaan" });

    submitButton.click();

    await waitFor(() => {
      expect(findings).toBeInvalid();
    });

    expect(findings).toHaveAccessibleErrorMessage(
      "Vul de bevindingen van het onderzoek in. Dit wordt opgenomen in het proces-verbaal van het gemeentelijk stembureau",
    );
    expect(await screen.findByTestId("corrected_results_error")).toBeVisible();
  });

  test("Navigate to the next page when submitting findings", async () => {
    server.use(PollingStationInvestigationConcludeHandler);
    const conclude = spyOnHandler(PollingStationInvestigationConcludeHandler);

    await renderPage(3);

    const findings = await screen.findByRole("textbox", { name: "Bevindingen" });
    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    const noRadio = await screen.findByRole("radio", { name: /Nee/ });

    const user = userEvent.setup();
    await user.type(findings, "Bevindingen van het onderzoek");

    noRadio.click();
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });
    expect(conclude).toHaveBeenCalledWith({
      findings: "Bevindingen van het onderzoek",
      corrected_results: false,
    });
    expect(pushMessage).toHaveBeenCalledWith({
      title: "Onderzoek voor stembureau 35 (Testschool) aangepast",
    });
  });

  test("Update the existing findings", async () => {
    const update = spyOnHandler(
      overrideOnce("put", "/api/polling_stations/2/investigation", 200, {
        findings: "New test findings 4",
        corrected_results: false,
      }),
    );

    await renderPage(2);

    const findings = await screen.findByRole("textbox", { name: "Bevindingen" });
    expect(findings).toHaveValue("Test findings 4");

    const user = userEvent.setup();
    await user.clear(findings);
    await user.type(findings, "New test findings 4");

    expect(findings).toHaveValue("New test findings 4");

    const noRadio = await screen.findByRole("radio", { name: /Nee/ });
    noRadio.click();

    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });
    expect(update).toHaveBeenCalledWith({
      reason: "Test reason 4",
      findings: "New test findings 4",
      corrected_results: false,
      accept_data_entry_deletion: false,
    });
    expect(pushMessage).toHaveBeenCalledWith({ title: "Onderzoek voor stembureau 34 (Testplek) aangepast" });
  });

  test("Navigates back on save with a warning message when data entry completed", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2, status: "completed" }));
    server.use(PollingStationInvestigationUpdateHandler);
    const update = spyOnHandler(
      overrideOnce("put", "/api/polling_stations/2/investigation", 200, {
        findings: "New test findings 4",
        corrected_results: false,
      }),
    );

    await renderPage(2);

    const findings = await screen.findByLabelText("Bevindingen");
    expect(findings).toHaveValue("Test findings 4");

    const user = userEvent.setup();
    await user.clear(findings);
    await user.type(findings, "New test findings 4");

    expect(findings).toHaveValue("New test findings 4");

    const noRadio = await screen.findByLabelText(/Nee/);
    noRadio.click();

    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });
    expect(update).toHaveBeenCalledWith({
      reason: "Test reason 4",
      findings: "New test findings 4",
      corrected_results: false,
      accept_data_entry_deletion: false,
    });
    expect(pushMessage).toHaveBeenCalledWith({
      type: "warning",
      title: "Maak een nieuw proces-verbaal voor deze zitting",
      text: "Onderzoek voor stembureau 34 (Testplek) aangepast. De eerder gemaakte documenten van deze zitting zijn daardoor niet meer geldig. Maak een nieuw proces-verbaal door de invoerfase opnieuw af te ronden.",
    });
  });

  test("Disables corrected results and forces corrected_results=true for new polling stations", async () => {
    server.use(PollingStationInvestigationUpdateHandler);
    const update = spyOnHandler(PollingStationInvestigationUpdateHandler);

    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData({}, { number: 2 }, [
        {
          polling_station_id: 3,
          reason: "Test investigation",
          findings: "Test findings",
        },
      ]),
      polling_stations: [
        {
          ...pollingStationMockData[2]!,
          id_prev_session: undefined,
        },
      ],
    });
    await renderPage(3);

    const correctedResults = await screen.findByRole("group", { name: "Is er een gecorrigeerde uitkomst?" });
    expect(correctedResults).toBeVisible();

    const yes = screen.getByTestId("corrected_results_yes");
    expect(yes).toBeChecked();
    expect(yes).toBeDisabled();

    const no = screen.getByTestId("corrected_results_no");
    expect(no).toBeDisabled();

    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });
    expect(update).toHaveBeenCalledWith({
      accept_data_entry_deletion: false,
      findings: "Test findings",
      reason: "Test investigation",
      // Always true for new polling stations
      corrected_results: true,
    });
  });

  test("Does not disable corrected results question when results are not required", async () => {
    server.use(PollingStationInvestigationUpdateHandler);
    const update = spyOnHandler(PollingStationInvestigationUpdateHandler);

    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData({}, { number: 2 }, [
        {
          polling_station_id: 3,
          reason: "Test investigation",
          findings: "Test findings",
        },
      ]),
      polling_stations: [
        {
          ...pollingStationMockData[2]!,
          id_prev_session: 1003,
        },
      ],
    });
    await renderPage(3);

    const correctedResults = await screen.findByRole("group", { name: "Is er een gecorrigeerde uitkomst?" });
    expect(correctedResults).toBeVisible();

    const yes = screen.getByTestId("corrected_results_yes");
    expect(yes).not.toBeChecked();
    expect(yes).not.toBeDisabled();

    const no = screen.getByTestId("corrected_results_no");
    expect(no).not.toBeDisabled();
    no.click();

    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });
    expect(update).toHaveBeenCalledWith({
      accept_data_entry_deletion: false,
      findings: "Test findings",
      reason: "Test investigation",
      // According to user choice
      corrected_results: false,
    });
  });

  test("Show warning when updating corrected results to no with data entry results", async () => {
    const update = spyOnHandler(
      overrideOnce("put", "/api/polling_stations/2/investigation", 409, {
        error: "Investigation has data entries or results",
        fatal: false,
        reference: "InvestigationHasDataEntryOrResult",
      } satisfies ErrorResponse),
    );

    await renderPage(2);
    const noRadio = await screen.findByRole("radio", { name: /Nee/ });
    noRadio.click();

    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    submitButton.click();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Er zijn al gecorrigeerde telresultaten ingevoerd. Als je verdergaat worden deze verwijderd.",
    );

    const acceptWarning = await screen.findByRole("checkbox", {
      name: "Ga verder en verwijder de gecorrigeerde telresultaten",
    });
    expect(acceptWarning).toBeVisible();
    expect(acceptWarning).not.toBeInvalid();

    submitButton.click();
    await waitFor(() => {
      expect(acceptWarning).toBeInvalid();
    });
    expect(update).toHaveBeenCalledTimes(1);

    overrideOnce("put", "/api/polling_stations/2/investigation", 200, {
      polling_station_id: 0,
      reason: "Test reason",
      corrected_results: false,
    } satisfies PollingStationInvestigation);

    acceptWarning.click();
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });

    expect(update).toHaveBeenCalledTimes(2);
    expect(pushMessage).toHaveBeenCalledWith({
      title: "Onderzoek voor stembureau 34 (Testplek) aangepast",
    });
  });

  test("Returns to list page with a success message when clicking delete investigation", async () => {
    server.use(PollingStationInvestigationDeleteHandler);
    const user = userEvent.setup();
    await renderPage(3);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
      }),
    ).toBeVisible();
    expect(await screen.findByRole("textbox", { name: "Bevindingen" })).toBeVisible();

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
    await renderPage(3);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
      }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Bevindingen")).toBeVisible();

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
