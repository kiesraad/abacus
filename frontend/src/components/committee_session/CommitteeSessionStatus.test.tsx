import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { type CommitteeSessionStatus, electionRoleValues } from "@/types/generated/openapi";

import { CommitteeSessionStatusWithIcon, HeaderCommitteeSessionStatusWithIcon } from "./CommitteeSessionStatus";

type Scenario = [CommitteeSessionStatus, "coordinator" | "typist", string, string];

const testScenarios: Scenario[] = [
  ["created", "coordinator", "IconSettings", "Zitting voorbereiden"],
  ["in_preparation", "coordinator", "IconSettings", "Klaar voor invoer"],
  ["data_entry", "coordinator", "IconCheckHeart", "Invoer bezig"],
  ["paused", "coordinator", "IconHourglass", "Invoer gepauzeerd"],
  ["completed", "coordinator", "IconCheckVerified", "Invoer afgerond"],
  ["created", "typist", "IconClock", "Nog niet gestart"],
  ["in_preparation", "typist", "IconClock", "Nog niet gestart"],
  ["data_entry", "typist", "IconCheckHeart", "Je kan invoeren"],
  ["paused", "typist", "IconHourglass", "Invoer gepauzeerd"],
  ["completed", "typist", "IconCheckVerified", "Alles is ingevoerd"],
];

describe("CommitteeSessionStatusWithIcon", () => {
  test.each(testScenarios)("Status with icon for %s with role %s", (state, role, icon, label) => {
    electionRoleValues.forEach((electionRole) => {
      render(<CommitteeSessionStatusWithIcon status={state} userRole={role} electionRole={electionRole} />);
      expect(screen.getByText(label)).toBeVisible();

      if (electionRole === "GSB") {
        expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("data-icon", icon);
      }
    });
  });
});

describe("HeaderCommitteeSessionStatusWithIcon", () => {
  test.each(testScenarios)("Status with icon for %s with role %s", (state, role, icon, label) => {
    electionRoleValues.forEach((electionRole) => {
      render(
        <HeaderCommitteeSessionStatusWithIcon
          electionRole={electionRole}
          status={state}
          userRole={role}
          committeeSessionNumber={1}
        />,
      );
      expect(screen.getByText(label)).toBeVisible();
      if (label === "Invoer afgerond") {
        expect(screen.getByText("(eerste zitting)")).toBeVisible();
      }
      if (electionRole === "GSB") {
        expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("data-icon", icon);
      }
    });
  });
});
