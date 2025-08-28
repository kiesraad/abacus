import { describe, expect, test } from "vitest";

import { emptyData } from "@/testing/api-mocks/DataEntryMockData";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { render, screen, within } from "@/testing/test-utils";
import { PollingStationResults, ValidationResults } from "@/types/generated/openapi";
import { DataEntrySection } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { ReadOnlyDataEntrySection } from "./ReadOnlyDataEntrySection";

describe("ReadOnlyDataEntrySection", () => {
  const electionMockData = getElectionMockData().election;
  const pollingStationResultsMockData: PollingStationResults = emptyData;

  const structure = getDataEntryStructure(electionMockData);
  const votersVotesSection = structure.find((s) => s.id === "voters_votes_counts")!;

  const renderComponent = (
    section: DataEntrySection = votersVotesSection,
    data: PollingStationResults = pollingStationResultsMockData,
    validationResults: ValidationResults = { errors: [], warnings: [] },
  ) => {
    return render(<ReadOnlyDataEntrySection section={section} data={data} validationResults={validationResults} />);
  };

  test("renders section with title", async () => {
    renderComponent();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Toegelaten kiezers en uitgebrachte stemmen B1-3.1 en 3.2",
      }),
    ).toBeVisible();
  });

  test("renders without any feedback when no validation results", async () => {
    renderComponent();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Toegelaten kiezers en uitgebrachte stemmen B1-3.1 en 3.2",
      }),
    ).toBeVisible();

    expect(screen.queryByTestId("feedback-error")).not.toBeInTheDocument();
    expect(screen.queryByText(/F\./)).not.toBeInTheDocument();
    expect(screen.queryByTestId("feedback-warning")).not.toBeInTheDocument();
    expect(screen.queryByText(/W\./)).not.toBeInTheDocument();
  });

  test("shows error feedback for on correct section", () => {
    const validationResults: ValidationResults = {
      errors: [
        validationResultMockData.F201, // voters_votes_counts error
        validationResultMockData.F303, // differences_counts error (should not show)
      ],
      warnings: [],
    };

    renderComponent(votersVotesSection, pollingStationResultsMockData, validationResults);

    const errorFeedback = screen.getByTestId("feedback-error");
    expect(within(errorFeedback).getByText("F.201")).toBeInTheDocument();
    expect(screen.queryByText("F.303")).not.toBeInTheDocument();
  });

  test("shows warning feedback for on correct section", () => {
    const validationResults: ValidationResults = {
      errors: [],
      warnings: [
        validationResultMockData.W201, // blank_votes_count warning
        validationResultMockData.W301, // differences_counts warning (should not show)
      ],
    };

    renderComponent(votersVotesSection, pollingStationResultsMockData, validationResults);

    const warningFeedback = screen.getByTestId("feedback-warning");
    expect(within(warningFeedback).getByText("W.201")).toBeInTheDocument();
    expect(screen.queryByText("W.301")).not.toBeInTheDocument();
  });

  test("shows both error and warning feedback when present", () => {
    const validationResults: ValidationResults = {
      errors: [validationResultMockData.F201],
      warnings: [validationResultMockData.W201],
    };

    renderComponent(votersVotesSection, pollingStationResultsMockData, validationResults);

    const errorFeedback = screen.getByTestId("feedback-error");
    expect(within(errorFeedback).getByText("F.201")).toBeInTheDocument();

    const warningFeedback = screen.getByTestId("feedback-warning");
    expect(within(warningFeedback).getByText("W.201")).toBeInTheDocument();
  });

  test("does not set focus on feedback components", () => {
    const validationResults: ValidationResults = {
      errors: [validationResultMockData.F201],
      warnings: [validationResultMockData.W201],
    };

    renderComponent(votersVotesSection, pollingStationResultsMockData, validationResults);

    const feedbackHeaders = screen.getAllByRole("heading", { level: 3 });
    feedbackHeaders.forEach((element) => {
      expect(document.activeElement).not.toBe(element);
    });
  });
});
