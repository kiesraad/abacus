import * as ReactRouter from "react-router";

import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";

import { AddInvestigationLayout } from "./AddInvestigationLayout";
import { InvestigationFindings } from "./InvestigationFindings";

const navigate = vi.fn();

async function renderPage() {
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "investigations/add/:pollingStationId",
          Component: AddInvestigationLayout,
          children: [
            {
              index: true,
              path: "findings",
              Component: InvestigationFindings,
            },
          ],
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations/add/1/findings");
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationFindings", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Renders a form", async () => {
    await renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
      }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Bevindingen")).toBeVisible();
  });

  test("Displays an error message when submitting an empty form", async () => {
    await renderPage();

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
    await renderPage();

    const findings = await screen.findByLabelText("Bevindingen");
    const submitButton = await screen.findByRole("button", { name: "Opslaan" });
    const noRadio = await screen.findByLabelText(/Nee/);

    const user = userEvent.setup();
    await user.type(findings, "Bevindingen van het onderzoek");

    noRadio.click();
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../../../");
    });
  });
});
