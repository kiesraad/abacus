import { describe, expect, test, vi } from "vitest";

import { getCSBCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { csbElectionMockData, electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen } from "@/testing/test-utils";
import type { Election, Role } from "@/types/generated/openapi";

import { DataEntryImportButton } from "./DataEntryImportButton";

const buttonName = "Tellingsbestand GSB importeren";

function renderButton(userRole: Role, election: Election, completed: boolean) {
  render(
    <TestUserProvider userRole={userRole}>
      <DataEntryImportButton
        election={election}
        committeeSession={getCSBCommitteeSessionMockData(completed ? { status: "completed" } : {})}
        navigate={vi.fn()}
      />
    </TestUserProvider>,
  );
}

describe("DataEntryImportButton", () => {
  test("shows the button for a CSB coordinator", () => {
    renderButton("coordinator_csb", csbElectionMockData, false);
    expect(screen.getByRole("button", { name: buttonName })).toBeVisible();
  });

  test.each([
    { situation: "an administrator", userRole: "administrator", election: csbElectionMockData, completed: false },
    { situation: "a GSB coordinator", userRole: "coordinator_gsb", election: electionMockData, completed: false },
    {
      situation: "a completed committee session",
      userRole: "coordinator_csb",
      election: csbElectionMockData,
      completed: true,
    },
  ] satisfies {
    situation: string;
    userRole: Role;
    election: Election;
    completed: boolean;
  }[])("hides the button for $situation", ({ userRole, election, completed }) => {
    renderButton(userRole, election, completed);
    expect(screen.queryByRole("button", { name: buttonName })).toBeNull();
  });
});
