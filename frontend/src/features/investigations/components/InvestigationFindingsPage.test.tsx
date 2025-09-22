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
  PollingStationInvestigationConcludeHandler,
  PollingStationInvestigationDeleteHandler,
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

  await router.navigate(`/elections/1/investigations/${pollingStationId}/findings`);
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationFindingsPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage, popMessages: vi.fn(() => []) });
  });

  test("Renders a form", async () => {
    await renderPage(3);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
      }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Bevindingen")).toBeVisible();
  });

  test("Displays an error message when submitting an empty form", async () => {
    await renderPage(3);

    const findings = await screen.findByLabelText("Bevindingen");
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

    const findings = await screen.findByLabelText("Bevindingen");
    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    const noRadio = await screen.findByLabelText(/Nee/);

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
      title: "Wijzigingen in onderzoek stembureau 35 (Testschool) opgeslagen",
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
    });
    expect(pushMessage).toHaveBeenCalledWith({ title: "Wijzigingen in onderzoek stembureau 34 (Testplek) opgeslagen" });
  });

  test("Renders delete button on update investigation and delete works", async () => {
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

    expect(pushMessage).toHaveBeenCalledWith({ title: "Onderzoek voor stembureau 35 (Testschool) verwijderd" });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/investigations");
    });
  });
});
