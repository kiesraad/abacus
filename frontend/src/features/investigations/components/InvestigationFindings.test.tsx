import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import {
  CommitteeSessionInvestigationConcludeHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";

import { InvestigationFindings } from "./InvestigationFindings";

const navigate = vi.fn();

function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <InvestigationFindings pollingStationId={1} />
    </ElectionProvider>,
  );
}

describe("InvestigationFindings", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler, CommitteeSessionInvestigationConcludeHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
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
  });
});
