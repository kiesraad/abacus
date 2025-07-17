import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Candidate, ElectionWithPoliticalGroups } from "@/types/generated/openapi";

import {
  createPoliticalGroupSections,
  differencesSection,
  getDataEntryStructure,
  votersAndVotesSection,
} from "./dataEntryStructure";

describe("votersAndVotesSection", () => {
  test("should have correct structure", () => {
    expect(votersAndVotesSection.id).toBe("voters_votes_counts");
    expect(votersAndVotesSection.subsections).toHaveLength(1);
    expect(votersAndVotesSection.subsections[0]?.type).toBe("inputGrid");

    if (votersAndVotesSection.subsections[0]?.type === "inputGrid") {
      expect(votersAndVotesSection.subsections[0].rows).toHaveLength(7);
      // Check that it has the basic voter and vote count rows
      expect(
        votersAndVotesSection.subsections[0].rows.some((row) => row.path === "voters_counts.poll_card_count"),
      ).toBe(true);
      expect(
        votersAndVotesSection.subsections[0].rows.some((row) => row.path === "votes_counts.total_votes_cast_count"),
      ).toBe(true);
    }
  });

  test("should have autoFocusInput on first row", () => {
    if (votersAndVotesSection.subsections[0]?.type === "inputGrid") {
      expect(votersAndVotesSection.subsections[0].rows[0]?.autoFocusInput).toBe(true);
    }
  });

  test("should have correct row codes", () => {
    if (votersAndVotesSection.subsections[0]?.type === "inputGrid") {
      const codes = votersAndVotesSection.subsections[0].rows.map((row) => row.code);
      expect(codes).toEqual(["A", "B", "D", "E", "F", "G", "H"]);
    }
  });
});

describe("differencesSection", () => {
  test("should have correct structure", () => {
    expect(differencesSection.id).toBe("differences_counts");
    expect(differencesSection.subsections).toHaveLength(1);
    expect(differencesSection.subsections[0]?.type).toBe("inputGrid");
  });

  test("should have all differences count fields", () => {
    if (differencesSection.subsections[0]?.type === "inputGrid") {
      const paths = differencesSection.subsections[0].rows.map((row) => row.path);
      expect(paths).toContain("differences_counts.more_ballots_count");
      expect(paths).toContain("differences_counts.fewer_ballots_count");
      expect(paths).toContain("differences_counts.unreturned_ballots_count");
      expect(paths).toContain("differences_counts.too_few_ballots_handed_out_count");
      expect(paths).toContain("differences_counts.too_many_ballots_handed_out_count");
      expect(paths).toContain("differences_counts.other_explanation_count");
      expect(paths).toContain("differences_counts.no_explanation_count");
    }
  });

  test("should have correct row codes", () => {
    if (differencesSection.subsections[0]?.type === "inputGrid") {
      const codes = differencesSection.subsections[0].rows.map((row) => row.code);
      expect(codes).toEqual(["I", "J", "K", "L", "M", "N", "O"]);
    }
  });

  test("should have autoFocusInput on first row", () => {
    if (differencesSection.subsections[0]?.type === "inputGrid") {
      expect(differencesSection.subsections[0].rows[0]?.autoFocusInput).toBe(true);
    }
  });
});

describe("createPoliticalGroupSections", () => {
  test("should create sections for each political group", () => {
    const sections = createPoliticalGroupSections(electionMockData);

    expect(sections).toHaveLength(electionMockData.political_groups.length);

    sections.forEach((section, index) => {
      expect(section.id).toBe(`political_group_votes_${electionMockData.political_groups[index]?.number}`);
      expect(section.title).toContain(electionMockData.political_groups[index]?.name);
    });
  });

  test("should create rows for each candidate plus total", () => {
    const sections = createPoliticalGroupSections(electionMockData);

    sections.forEach((section, groupIndex) => {
      const politicalGroup = electionMockData.political_groups[groupIndex];
      if (section.subsections[0]?.type === "inputGrid" && politicalGroup) {
        const expectedRows = politicalGroup.candidates.length + 1; // candidates + total
        expect(section.subsections[0].rows).toHaveLength(expectedRows);

        // Check candidate rows
        politicalGroup.candidates.forEach((candidate, candidateIndex) => {
          const row =
            section.subsections[0]?.type === "inputGrid" ? section.subsections[0].rows[candidateIndex] : undefined;
          expect(row?.code).toBe(candidate.number.toString());
          expect(row?.path).toBe(
            `political_group_votes[${politicalGroup.number - 1}].candidate_votes[${candidateIndex}].votes`,
          );
        });

        // Check total row
        const totalRow = section.subsections[0].rows[section.subsections[0].rows.length - 1];
        expect(totalRow?.path).toBe(`political_group_votes[${politicalGroup.number - 1}].total`);
        expect(totalRow?.isListTotal).toBe(true);
      }
    });
  });

  test("should set autoFocusInput on first candidate", () => {
    const sections = createPoliticalGroupSections(electionMockData);

    sections.forEach((section) => {
      if (section.subsections[0]?.type === "inputGrid") {
        expect(section.subsections[0].rows[0]?.autoFocusInput).toBe(true);
        // Other rows should not have autoFocus
        for (let i = 1; i < section.subsections[0].rows.length; i++) {
          expect(section.subsections[0].rows[i]?.autoFocusInput).toBeFalsy();
        }
      }
    });
  });

  test("should add separators every 25 candidates", () => {
    // Create a mock election with many candidates
    const manyCandidatesElection: ElectionWithPoliticalGroups = {
      ...electionMockData,
      political_groups: [
        {
          number: 1,
          name: "Test Group",
          candidates: Array.from(
            { length: 30 },
            (_, i) =>
              ({
                number: i + 1,
                initials: "T",
                first_name: "Test",
                last_name: `Candidate ${i + 1}`,
                locality: "",
              }) satisfies Candidate,
          ),
        },
      ],
    };

    const sections = createPoliticalGroupSections(manyCandidatesElection);

    if (sections[0]?.subsections[0]?.type === "inputGrid") {
      const rows = sections[0].subsections[0].rows;
      // Should have separator after 25th candidate (index 24)
      expect(rows[24]?.addSeparator).toBe(true);
      // Should not have separator on last candidate (index 29)
      expect(rows[29]?.addSeparator).toBeFalsy();
    }
  });

  test("should handle empty political groups", () => {
    const emptyElection: ElectionWithPoliticalGroups = {
      ...electionMockData,
      political_groups: [],
    };

    const sections = createPoliticalGroupSections(emptyElection);
    expect(sections).toHaveLength(0);
  });

  test("should handle political group with no candidates", () => {
    const noCandidatesElection: ElectionWithPoliticalGroups = {
      ...electionMockData,
      political_groups: [
        {
          number: 1,
          name: "Empty Group",
          candidates: [],
        },
      ],
    };

    const sections = createPoliticalGroupSections(noCandidatesElection);
    expect(sections).toHaveLength(1);

    if (sections[0]?.subsections[0]?.type === "inputGrid") {
      // Should only have the total row
      expect(sections[0].subsections[0].rows).toHaveLength(1);
      expect(sections[0].subsections[0].rows[0]?.isListTotal).toBe(true);
    }
  });
});

describe("getDataEntryStructure", () => {
  test("should return all sections in correct order", () => {
    const structure = getDataEntryStructure(electionMockData);

    const expectedLength = 2 + electionMockData.political_groups.length; // voters_votes + differences + political groups
    expect(structure).toHaveLength(expectedLength);

    expect(structure[0]?.id).toBe("voters_votes_counts");
    expect(structure[1]?.id).toBe("differences_counts");

    // Check political group sections
    for (let i = 0; i < electionMockData.political_groups.length; i++) {
      expect(structure[2 + i]?.id).toBe(`political_group_votes_${electionMockData.political_groups[i]?.number}`);
    }
  });
});
