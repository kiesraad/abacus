import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Candidate, ElectionWithPoliticalGroups, PollingStationResults } from "@/types/generated/openapi";

import {
  createPoliticalGroupSections,
  createVotersAndVotesSection,
  differencesSection,
  getDataEntryStructure,
  recountedSection,
} from "./structure";

describe("recountedSection", () => {
  test("should have correct structure", () => {
    expect(recountedSection.id).toBe("recounted");
    expect(recountedSection.subsections).toHaveLength(2);
    expect(recountedSection.subsections[0]?.type).toBe("message");
    expect(recountedSection.subsections[1]?.type).toBe("radio");
  });

  test("should have radio subsection with boolean valueType", () => {
    const radioSubsection = recountedSection.subsections[1];
    if (radioSubsection?.type === "radio") {
      expect(radioSubsection.valueType).toBe("boolean");
      expect(radioSubsection.path).toBe("recounted");
      expect(radioSubsection.options).toHaveLength(2);
      expect(radioSubsection.options[0]?.value).toBe("true");
      expect(radioSubsection.options[1]?.value).toBe("false");
    }
  });
});

describe("createVotersAndVotesSection", () => {
  test("should create section without recount subsections when recounted is false", () => {
    const section = createVotersAndVotesSection(false);

    expect(section.id).toBe("voters_votes_counts");
    expect(section.subsections).toHaveLength(1);
    expect(section.subsections[0]?.type).toBe("inputGrid");

    if (section.subsections[0]?.type === "inputGrid") {
      expect(section.subsections[0].rows).toHaveLength(8);
      // Check that it has the basic voter and vote count rows
      expect(section.subsections[0].rows.some((row) => row.path === "voters_counts.poll_card_count")).toBe(true);
      expect(section.subsections[0].rows.some((row) => row.path === "votes_counts.total_votes_cast_count")).toBe(true);
    }
  });

  test("should create section with recount subsections when recounted is true", () => {
    const section = createVotersAndVotesSection(true);

    expect(section.id).toBe("voters_votes_counts");
    expect(section.subsections).toHaveLength(3); // Voters and votes counts inputGrid inputGrid + heading + recount inputGrid

    // Check for heading subsection
    expect(section.subsections[1]?.type).toBe("heading");

    // Check for recount inputGrid
    expect(section.subsections[2]?.type).toBe("inputGrid");
    if (section.subsections[2]?.type === "inputGrid") {
      expect(section.subsections[2].rows.some((row) => row.path === "voters_recounts.poll_card_count")).toBe(true);
      expect(
        section.subsections[2].rows.some((row) => row.path === "voters_recounts.total_admitted_voters_count"),
      ).toBe(true);
    }
  });

  test("should have autoFocusInput on first row", () => {
    const section = createVotersAndVotesSection(false);

    if (section.subsections[0]?.type === "inputGrid") {
      expect(section.subsections[0].rows[0]?.autoFocusInput).toBe(true);
    }
  });

  test("should have correct row codes", () => {
    const section = createVotersAndVotesSection(true);

    if (section.subsections[0]?.type === "inputGrid") {
      const codes = section.subsections[0].rows.map((row) => row.code);
      expect(codes).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    }

    if (section.subsections[2]?.type === "inputGrid") {
      const recountCodes = section.subsections[2].rows.map((row) => row.code);
      expect(recountCodes).toEqual(["A.2", "B.2", "C.2", "D.2"]);
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
    const manyCapabilitiesElection: ElectionWithPoliticalGroups = {
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

    const sections = createPoliticalGroupSections(manyCapabilitiesElection);

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

    const expectedLength = 3 + electionMockData.political_groups.length; // recounted + voters_votes + differences + political groups
    expect(structure).toHaveLength(expectedLength);

    expect(structure[0]?.id).toBe("recounted");
    expect(structure[1]?.id).toBe("voters_votes_counts");
    expect(structure[2]?.id).toBe("differences_counts");

    // Check political group sections
    for (let i = 0; i < electionMockData.political_groups.length; i++) {
      expect(structure[3 + i]?.id).toBe(`political_group_votes_${electionMockData.political_groups[i]?.number}`);
    }
  });

  test("should pass recounted flag to voters and votes section", () => {
    const pollingStationResults: PollingStationResults = {
      recounted: true,
      voters_counts: {
        poll_card_count: 0,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 0,
      },
      votes_counts: {
        votes_candidates_count: 0,
        blank_votes_count: 0,
        invalid_votes_count: 0,
        total_votes_cast_count: 0,
      },
      differences_counts: {
        more_ballots_count: 0,
        fewer_ballots_count: 0,
        unreturned_ballots_count: 0,
        too_few_ballots_handed_out_count: 0,
        too_many_ballots_handed_out_count: 0,
        other_explanation_count: 0,
        no_explanation_count: 0,
      },
      political_group_votes: [],
    };

    const structure = getDataEntryStructure(electionMockData, pollingStationResults);
    const votersVotesSection = structure.find((s) => s.id === "voters_votes_counts");

    expect(votersVotesSection?.subsections).toHaveLength(3); // Voters and votes counts inputGrid + heading + recount
  });

  test("should work without polling station results", () => {
    const structure = getDataEntryStructure(electionMockData);
    const votersVotesSection = structure.find((s) => s.id === "voters_votes_counts");

    expect(votersVotesSection?.subsections).toHaveLength(1); // Only voters and votes counts inputGrid
  });

  test("should work with recounted false", () => {
    const pollingStationResults: PollingStationResults = {
      recounted: false,
      voters_counts: {
        poll_card_count: 0,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 0,
      },
      votes_counts: {
        votes_candidates_count: 0,
        blank_votes_count: 0,
        invalid_votes_count: 0,
        total_votes_cast_count: 0,
      },
      differences_counts: {
        more_ballots_count: 0,
        fewer_ballots_count: 0,
        unreturned_ballots_count: 0,
        too_few_ballots_handed_out_count: 0,
        too_many_ballots_handed_out_count: 0,
        other_explanation_count: 0,
        no_explanation_count: 0,
      },
      political_group_votes: [],
    };

    const structure = getDataEntryStructure(electionMockData, pollingStationResults);
    const votersVotesSection = structure.find((s) => s.id === "voters_votes_counts");

    expect(votersVotesSection?.subsections).toHaveLength(1); // Only voters and votes counts inputGrid
  });
});
