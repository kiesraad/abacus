import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type { CommitteeCategory, CommitteeSessionStatus } from "@/types/generated/openapi";

import { CommitteeSessionStatusWithIcon, HeaderCommitteeSessionStatusWithIcon } from "./CommitteeSessionStatus";

type Scenario = [CommitteeCategory, CommitteeSessionStatus, "coordinator" | "typist", string, string];

const testScenarios: Scenario[] = [
  ["GSB", "created", "coordinator", "IconSettings", "Zitting voorbereiden"],
  ["GSB", "ready", "coordinator", "IconSettings", "Klaar voor invoer"],
  ["GSB", "data_entry", "coordinator", "IconCheckHeart", "Invoer bezig"],
  ["GSB", "paused", "coordinator", "IconHourglass", "Invoer gepauzeerd"],
  ["GSB", "completed", "coordinator", "IconCheckVerified", "Invoer afgerond"],
  ["GSB", "created", "typist", "IconClock", "Nog niet gestart"],
  ["GSB", "ready", "typist", "IconClock", "Nog niet gestart"],
  ["GSB", "data_entry", "typist", "IconCheckHeart", "Je kan invoeren"],
  ["GSB", "paused", "typist", "IconHourglass", "Invoer gepauzeerd"],
  ["GSB", "completed", "typist", "IconCheckVerified", "Alles is ingevoerd"],
  ["CSB", "created", "coordinator", "IconSettings", "Zitting voorbereiden"],
  ["CSB", "ready", "coordinator", "IconSettings", "Klaar voor invoer"],
  ["CSB", "data_entry", "coordinator", "IconCheckHeart", "Invoer bezig"],
  ["CSB", "paused", "coordinator", "IconHourglass", "Invoer gepauzeerd"],
  ["CSB", "completed", "coordinator", "IconCheckVerified", "Invoer afgerond"],
  ["CSB", "created", "typist", "IconClock", "Nog niet gestart"],
  ["CSB", "ready", "typist", "IconClock", "Nog niet gestart"],
  ["CSB", "data_entry", "typist", "IconCheckHeart", "Je kan invoeren"],
  ["CSB", "paused", "typist", "IconHourglass", "Invoer gepauzeerd"],
  ["CSB", "completed", "typist", "IconCheckVerified", "Alles is ingevoerd"],
];

describe("CommitteeSessionStatusWithIcon", () => {
  test.each(
    testScenarios,
  )("%s: Status with icon for %s with role %s", (committeeCategory, state, role, icon, label) => {
    render(<CommitteeSessionStatusWithIcon status={state} userRole={role} committeeCategory={committeeCategory} />);
    expect(screen.getByText(label)).toBeVisible();

    if (committeeCategory === "GSB") {
      expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("data-icon", icon);
    }
  });
});

describe("HeaderCommitteeSessionStatusWithIcon", () => {
  test.each(
    testScenarios,
  )("%s: Status with icon for %s with role %s", (committeeCategory, state, role, icon, label) => {
    render(
      <HeaderCommitteeSessionStatusWithIcon
        committeeCategory={committeeCategory}
        status={state}
        userRole={role}
        committeeSessionNumber={1}
      />,
    );
    expect(screen.getByText(label)).toBeVisible();
    if (label === "Invoer afgerond") {
      if (committeeCategory === "CSB") {
        expect(screen.getByText("(zitting CSB)")).toBeVisible();
      } else {
        expect(screen.getByText("(eerste zitting)")).toBeVisible();
      }
    }
    if (committeeCategory === "GSB") {
      expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("data-icon", icon);
    }
  });
});
