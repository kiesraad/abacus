import { describe, expect, test } from "vitest";

import type { CommitteeSessionStatus } from "@/types/generated/openapi";

import { isPollingStationCreateAndUpdateAllowed } from "./checks";

describe("Test isPollingStationCreateAndUpdateAllowed", () => {
  test.each([
    { isCoordinator: true, isAdministrator: false, status: "created", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "created", expected: true },
    { isCoordinator: false, isAdministrator: false, status: "created", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "in_preparation", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "in_preparation", expected: true },
    { isCoordinator: false, isAdministrator: false, status: "in_preparation", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "data_entry", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "data_entry", expected: false },
    { isCoordinator: false, isAdministrator: false, status: "data_entry", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "paused", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "paused", expected: false },
    { isCoordinator: false, isAdministrator: false, status: "paused", expected: false },
    { isCoordinator: true, isAdministrator: false, status: "completed", expected: true },
    { isCoordinator: false, isAdministrator: true, status: "completed", expected: false },
    { isCoordinator: false, isAdministrator: false, status: "completed", expected: false },
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
