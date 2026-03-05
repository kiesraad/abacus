import { describe, expect, test } from "vitest";

import { type Role, roleValues } from "@/types/generated/openapi";
import { isAdministrator, isCoordinator, isTypist } from "@/utils/role";

describe("Role util", () => {
  test.each(
    roleValues,
  )("Role %j should be true once for isAdministrator(), isCoordinator() or isTypist()", (role: Role) => {
    const trueCount = [isAdministrator(role), isCoordinator(role), isTypist(role)].reduce(
      (trueCount, result) => (result ? trueCount + 1 : trueCount),
      0,
    );

    expect(trueCount).toBe(1);
  });

  test.each([isAdministrator, isCoordinator, isTypist])("Invoking %o with undefined should return false", (fn: (
    role?: Role,
  ) => boolean) => {
    expect(fn(undefined)).toBe(false);
  });
});
