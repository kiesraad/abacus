import { describe, expect, test } from "vitest";

import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { isPollingStationCreateAndUpdateAllowed } from "./checks";

describe("Test isPollingStationCreateAndUpdateAllowed", () => {
  test.each([
    { isCoordinator: true, isAdministrator: false, status: "created", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "created", expected: true },
    { isCoordinator: false, isAdministrator: false, status: "created", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_not_started", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_not_started", expected: true },
    { isCoordinator: false, isAdministrator: false, status: "data_entry_not_started", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_in_progress", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_in_progress", expected: false },
    { isCoordinator: false, isAdministrator: false, status: "data_entry_in_progress", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_paused", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_paused", expected: false },
    { isCoordinator: false, isAdministrator: false, status: "data_entry_paused", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "data_entry_finished", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry_finished", expected: false },
    { isCoordinator: false, isAdministrator: false, status: "data_entry_finished", expected: false },
  ] satisfies Array<{
    isCoordinator: boolean;
    isAdministrator: boolean;
    status: CommitteeSessionStatus;
    expected: boolean;
  }>)("isPollingStationCreateAndUpdateAllowed for isCoordinator=$isCoordinator and isAdministrator=$isAdministrator with committee session status=$status should return $expected", ({
    isCoordinator,
    isAdministrator,
    status,
    expected,
  }) => {
    expect(isPollingStationCreateAndUpdateAllowed(isCoordinator, isAdministrator, status)).toEqual(expected);
  });
});
