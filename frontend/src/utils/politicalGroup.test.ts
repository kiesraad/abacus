import { describe, expect, it } from "vitest";

import type { Candidate, PoliticalGroup } from "@/types/generated/openapi";

import { formatPoliticalGroupName } from "./politicalGroup";

describe("formatPoliticalGroupName", () => {
  it("returns empty string when no political group provided", () => {
    expect(formatPoliticalGroupName(undefined)).toBe("");
  });

  it("formats named political groups correctly", () => {
    const politicalGroup1: PoliticalGroup = { name: "Group Name", number: 10, candidates: [] };

    expect(formatPoliticalGroupName(politicalGroup1)).toBe("Lijst 10 - Group Name");
    expect(formatPoliticalGroupName(politicalGroup1, false)).toBe("Group Name");
  });

  it("formats unnamed political groups correctly", () => {
    const politicalGroup1: PoliticalGroup = { name: "", number: 2, candidates: [] };
    const politicalGroup2: PoliticalGroup = {
      name: "",
      number: 123,
      candidates: [
        {
          last_name: "Boer",
          last_name_prefix: "de",
          initials: "A.B.",
          first_name: "Anne",
          gender: "Female",
        } as Candidate,
      ],
    };

    expect(formatPoliticalGroupName(politicalGroup1)).toBe("Lijst 2 - Blanco");
    expect(formatPoliticalGroupName(politicalGroup1, false)).toBe("Blanco");
    expect(formatPoliticalGroupName(politicalGroup2)).toBe("Lijst 123 - Blanco (De Boer, A.B.)");
    expect(formatPoliticalGroupName(politicalGroup2, false)).toBe("Blanco (De Boer, A.B.)");
  });
});
