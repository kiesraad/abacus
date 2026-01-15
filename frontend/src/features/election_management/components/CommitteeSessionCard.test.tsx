import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { CommitteeSessionStatusChangeRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";
import { getAdminUser, getCoordinatorUser } from "@/testing/user-mock-data";
import type { CommitteeSessionStatus, Role } from "@/types/generated/openapi";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

const navigate = vi.fn();

type TestCases = {
  [role in Exclude<Role, "typist">]: Record<
    CommitteeSessionStatus,
    {
      buttonsCurrentSession?: string[];
      buttonsNotCurrentSession?: string[];
      actionButton?: string;
    }
  >[];
};

/**
 * Test cases for both first and second committee sessions.
 * - buttonsCurrentSession: buttons if card represents the current session
 * - buttonsNotCurrentSession: buttons if card represents not the current session
 * - actionButton: link button of card
 */
const testCases: TestCases = {
  coordinator: [
    {
      // First session
      created: {
        buttonsCurrentSession: ["Details van de zitting"],
      },
      in_preparation: {
        buttonsCurrentSession: ["Details van de zitting", "Start invoer"],
      },
      data_entry: {
        buttonsCurrentSession: ["Details van de zitting"],
        actionButton: "Bekijk voortgang",
      },
      paused: {
        buttonsCurrentSession: ["Hervatten of voortgang bekijken", "Details van de zitting"],
      },
      completed: {
        buttonsCurrentSession: ["Resultaten en documenten", "Invoer bekijken"],
        buttonsNotCurrentSession: ["Resultaten en documenten"],
      },
    },
    {
      // Second session
      created: {
        buttonsCurrentSession: ["Aangevraagde onderzoeken", "Details van de zitting", "Zitting verwijderen"],
      },
      in_preparation: {
        buttonsCurrentSession: [
          "Aangevraagde onderzoeken",
          "Details van de zitting",
          "Zitting verwijderen",
          "Start invoer",
        ],
      },
      data_entry: {
        buttonsCurrentSession: ["Aangevraagde onderzoeken", "Details van de zitting"],
        actionButton: "Bekijk voortgang",
      },
      paused: {
        buttonsCurrentSession: [
          "Hervatten of voortgang bekijken",
          "Aangevraagde onderzoeken",
          "Details van de zitting",
        ],
      },
      completed: {
        buttonsCurrentSession: ["Resultaten en documenten", "Aangevraagde onderzoeken", "Invoer bekijken"],
        buttonsNotCurrentSession: ["Resultaten en documenten"],
      },
    },
  ],
  administrator: [
    {
      // First session
      created: {},
      in_preparation: {},
      data_entry: {
        actionButton: "Bekijk voortgang",
      },
      paused: {
        buttonsCurrentSession: ["Bekijk voortgang"],
      },
      completed: {
        buttonsCurrentSession: ["Invoer bekijken"],
      },
    },
    {
      // Second session
      created: {
        buttonsCurrentSession: ["Aangevraagde onderzoeken"],
      },
      in_preparation: {
        buttonsCurrentSession: ["Aangevraagde onderzoeken"],
      },
      data_entry: {
        buttonsCurrentSession: ["Aangevraagde onderzoeken"],
        actionButton: "Bekijk voortgang",
      },
      paused: {
        buttonsCurrentSession: ["Bekijk voortgang", "Aangevraagde onderzoeken"],
      },
      completed: {
        buttonsCurrentSession: ["Aangevraagde onderzoeken", "Invoer bekijken"],
      },
    },
  ],
};

describe("UI component: CommitteeSessionCard", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  const createTest = (
    role: string,
    sessionNumber: number,
    isCurrentSession: boolean,
    status: CommitteeSessionStatus,
    expectedButtons: string[] = [],
    actionButton?: string,
  ) => {
    const testName = `${role} - session ${sessionNumber} - ${status} ${isCurrentSession ? "(current)" : "(not current)"}`;

    test(testName, () => {
      const user = role === "coordinator" ? getCoordinatorUser() : getAdminUser();
      vi.spyOn(useUser, "useUser").mockReturnValue(user);

      const expectedTitle = sessionNumber === 1 ? "Eerste zitting" : "Tweede zitting";
      const expectedSubtitle =
        {
          created: "— Zitting voorbereiden",
          in_preparation: "— Klaar voor invoer",
          data_entry: "— Invoer bezig",
          paused: "— Invoer gepauzeerd",
          completed: "— Invoer afgerond",
        }[status] || "";

      const committeeSession = getCommitteeSessionMockData({
        number: sessionNumber,
        status,
        start_date_time: isCurrentSession ? undefined : "2025-11-09T09:15:00",
        location: "Juinen",
      });

      render(<CommitteeSessionCard committeeSession={committeeSession} isCurrentSession={isCurrentSession} />);

      expect(screen.getByText(expectedTitle)).toBeVisible();
      expect(screen.getByText(expectedSubtitle)).toBeVisible();

      if (!isCurrentSession) {
        expect(screen.getByText("zondag 9 november 2025 om 09:15")).toBeVisible();
      } else {
        expect(screen.queryByText("zondag 9 november 2025 om 09:15")).not.toBeInTheDocument();
      }

      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(expectedButtons.length);
      expectedButtons.forEach((buttonName: string, index: number) => {
        expect(buttons[index]).toHaveAccessibleName(buttonName);
      });

      if (actionButton) {
        const linkElement = screen.getByRole("link", { name: actionButton });
        expect(linkElement).toBeVisible();
      } else {
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
      }
    });
  };

  // Run tests per role/session number/status combination
  Object.entries(testCases).forEach(([role, sessions]) => {
    sessions.forEach((session, index) => {
      Object.entries(session).forEach(([status, testCase]) => {
        // Test card for current and non-current session
        createTest(
          role,
          index + 1,
          true,
          status as CommitteeSessionStatus,
          testCase.buttonsCurrentSession,
          testCase.actionButton,
        );
        createTest(role, index + 1, false, status as CommitteeSessionStatus, testCase.buttonsNotCurrentSession);
      });
    });
  });

  test("Validate start data entry status change", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

    const user = userEvent.setup();
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "in_preparation",
      start_date_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} isCurrentSession={true} />);

    const dataEntryButton = await screen.findByRole("button", { name: "Start invoer" });
    await user.click(dataEntryButton);
    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry" });
    expect(navigate).toHaveBeenCalledWith("status");
  });

  test("Validate delete action", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

    const user = userEvent.setup();
    const committeeSession = getCommitteeSessionMockData({
      number: 2,
      status: "in_preparation",
      start_date_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} isCurrentSession={true} />);

    const deleteButton = await screen.findByRole("button", { name: "Zitting verwijderen" });
    await user.click(deleteButton);
    expect(statusChange).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(".", { state: { showDeleteModal: true } });
  });
});
