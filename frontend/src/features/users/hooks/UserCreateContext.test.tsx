import { describe, expect, test } from "vitest";
import {
  isRoleWithoutCommitteeCategory,
  type RoleWithoutCommitteeCategory,
  roleWithoutCommitteeCategoryValues,
} from "@/features/users/hooks/UserCreateContext";

describe("UserCreateContext", () => {
  test.each(
    roleWithoutCommitteeCategoryValues,
  )("String %j should be a RoleWithoutCommitteeCategory", (role: RoleWithoutCommitteeCategory) => {
    expect(isRoleWithoutCommitteeCategory(role as string)).toBe(true);
  });

  test('String "typist_gsb" is not a RoleWithoutCommitteeCategory', () => {
    expect(isRoleWithoutCommitteeCategory("typist_gsb")).toBe(false);
  });
});
