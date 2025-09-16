import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionInvestigationCreateHandler,
  CommitteeSessionInvestigationUpdateHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, waitFor } from "@/testing/test-utils";

import { InvestigationReason } from "./InvestigationReason";

const navigate = vi.fn();

function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <InvestigationReason pollingStationId={1} />
    </ElectionProvider>,
  );
}

describe("InvestigationReason", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler, CommitteeSessionInvestigationCreateHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Renders a form", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aanleiding en opdracht van het centraal stembureau" }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Aanleiding en opdracht")).toBeVisible();
  });

  test("Displays an error message when submitting an empty form", async () => {
    const electionData = getElectionMockData({}, {}, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    renderPage();

    const reason = await screen.findByLabelText("Aanleiding en opdracht");
    const submitButton = await screen.findByRole("button", { name: "Volgende" });

    submitButton.click();

    await waitFor(() => {
      expect(reason).toBeInvalid();
    });

    expect(reason).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
  });

  test("Navigate to the next page when submitting a reason", async () => {
    const electionData = getElectionMockData({}, {}, []);
    overrideOnce("get", "/api/elections/1", 200, electionData);

    renderPage();

    const reason = await screen.findByLabelText("Aanleiding en opdracht");
    const submitButton = await screen.findByRole("button", { name: "Volgende" });

    const user = userEvent.setup();
    await user.type(reason, "Reden voor onderzoek");
    submitButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../print-corrigendum");
    });
  });

  test("Update the existing reason", async () => {
    server.use(CommitteeSessionInvestigationUpdateHandler);
    const update = spyOnHandler(CommitteeSessionInvestigationUpdateHandler);

    renderPage();

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
  });
});
