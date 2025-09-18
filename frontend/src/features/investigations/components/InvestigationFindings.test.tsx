import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationInvestigationConcludeHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, waitFor } from "@/testing/test-utils";

import { InvestigationFindings } from "./InvestigationFindings";

const navigate = vi.fn();
const pushMessage = vi.fn();

function renderPage(pollingStationId = 3) {
  render(
    <ElectionProvider electionId={1}>
      <InvestigationFindings pollingStationId={pollingStationId} />
    </ElectionProvider>,
  );
}

describe("InvestigationFindings", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler, PollingStationInvestigationConcludeHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage, popMessages: vi.fn(() => []) });
  });

  test("Renders a form", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
      }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Bevindingen")).toBeVisible();
  });

  test("Displays an error message when submitting an empty form", async () => {
    renderPage();

    const findings = await screen.findByLabelText("Bevindingen");
    const submitButton = await screen.findByRole("button", { name: "Opslaan" });

    submitButton.click();

    await waitFor(() => {
      expect(findings).toBeInvalid();
    });

    expect(findings).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
    expect(await screen.findByTestId("corrected_results_error")).toBeVisible();
  });

  test("Navigate to the next page when submitting findings", async () => {
    const conclude = spyOnHandler(PollingStationInvestigationConcludeHandler);

    renderPage();

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

    renderPage(2);

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
});
