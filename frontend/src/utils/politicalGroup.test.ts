import { describe, expect, it } from "vitest";

import type { PoliticalGroup } from "@/types/generated/openapi";

import { formatPoliticalGroupName } from "./politicalGroup";

describe("formatPoliticalGroupName", () => {
  it("formats named political groups correctly", () => {
    const politicalGroup1: PoliticalGroup = { name: "Group Name", number: 10, candidates: [] };
    const politicalGroup2: PoliticalGroup = { name: "Test Group", number: 15, candidates: [] };

    expect(formatPoliticalGroupName(politicalGroup1)).toBe("Lijst 10 - Group Name");
    expect(formatPoliticalGroupName(politicalGroup2)).toBe("Lijst 15 - Test Group");
  });

  it("formats unnamed political groups correctly", () => {
    const politicalGroup1: PoliticalGroup = { name: "", number: 2, candidates: [] };
    const politicalGroup2: PoliticalGroup = { name: "", number: 123, candidates: [] };

    expect(formatPoliticalGroupName(politicalGroup1)).toBe("Lijst 2");
    expect(formatPoliticalGroupName(politicalGroup2)).toBe("Lijst 123");
  });
});
