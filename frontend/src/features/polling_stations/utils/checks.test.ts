import { describe, expect, test } from "vitest";

import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { isPollingStationUpdateAllowed } from "./checks";

describe("Test isPollingStationUpdateAllowed", () => {
  test.each([
    { isCoordinator: true, isAdministrator: false, status: "created", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "created", expected: true },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_not_started", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_not_started", expected: true },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_in_progress", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_in_progress", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_paused", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_paused", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_finished", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_finished", expected: false },
  ] satisfies Array<{
    isCoordinator: boolean;
    isAdministrator: boolean;
    status: CommitteeSessionStatus;
    expected: boolean;
  }>)(
    "isPollingStationUpdateAllowed for isCoordinator=$isCoordinator and isAdministrator=$isAdministrator with committee session status=$status should return $expected",
    ({ isCoordinator, isAdministrator, status, expected }) => {
      expect(isPollingStationUpdateAllowed(isCoordinator, isAdministrator, status)).toEqual(expected);
    },
  );
});
