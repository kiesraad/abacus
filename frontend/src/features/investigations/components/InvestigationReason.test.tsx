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
import { InvestigationReason } from "./InvestigationReason";

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
              path: "reason",
              Component: InvestigationReason,
            },
          ],
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations/add/1/reason");
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationReason", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Renders a form", async () => {
    await renderPage();

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aanleiding en opdracht van het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Aanleiding en opdracht")).toBeVisible();
  });

  test("Displays an error message when submitting an empty form", async () => {
    await renderPage();

    const reason = await screen.findByLabelText("Aanleiding en opdracht");
    const submitButton = await screen.findByRole("button", { name: "Volgende" });

    submitButton.click();

    await waitFor(() => {
      expect(reason).toBeInvalid();
    });

    expect(reason).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
  });

  test("Navigate to the next page when submittin a reason", async () => {
    await renderPage();

    const reason = await screen.findByLabelText("Aanleiding en opdracht");
    const submitButton = await screen.findByRole("button", { name: "Volgende" });

    const user = userEvent.setup();
    await user.type(reason, "Reden voor onderzoek");
    submitButton.click();

    expect(navigate).toHaveBeenCalledWith("../print-corrigendum");
  });
});
