import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ElectionStatus } from "@/types/generated/openapi";

import { ElectionStatusWithIcon, HeaderElectionStatusWithIcon } from "./ElectionStatusWithIcon";

type Scenario = [ElectionStatus, "coordinator" | "typist", string, string];

const testScenarios: Scenario[] = [
  ["DataEntryInProgress", "coordinator", "IconCheckHeart", "Steminvoer bezig"],
  ["DataEntryFinished", "coordinator", "IconCheckVerified", "Steminvoer klaar"],
  ["DataEntryInProgress", "typist", "IconCheckHeart", "Steminvoer bezig"],
  ["DataEntryFinished", "typist", "IconCheckVerified", "Steminvoer klaar"],
];

describe("ElectionStatusWithIcon", () => {
  test.each(testScenarios)("Status with icon for %s with role %s", (state, role, icon, label) => {
    render(<ElectionStatusWithIcon status={state} userRole={role} />);
    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByRole("img")).toHaveAttribute("data-icon", icon);
  });
});

describe("HeaderElectionStatusWithIcon", () => {
  test.each(testScenarios)("Status with icon for %s with role %s", (state, role, icon, label) => {
    render(<HeaderElectionStatusWithIcon status={state} userRole={role} />);
    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByRole("img")).toHaveAttribute("data-icon", icon);
  });
});
