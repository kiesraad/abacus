import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import type { Candidate, ElectionWithPoliticalGroups } from "@/types/generated/openapi";
import type { DataEntryModel, InputGridSubsection } from "@/types/types";

import {
  createPoliticalGroupSections,
  createVotersAndVotesSection,
  differencesSection,
  getDataEntryStructure,
} from "./dataEntryStructure";

const model: DataEntryModel = "CSOFirstSession";

describe("votersAndVotesSection", () => {
  test("should have correct structure", () => {
    const votersAndVotesSection = createVotersAndVotesSection(model, electionMockData);
    expect(votersAndVotesSection.id).toBe("voters_votes_counts");
    expect(votersAndVotesSection.subsections).toHaveLength(1);

    const inputGrid = votersAndVotesSection.subsections[0] as InputGridSubsection;
    expect(inputGrid.type).toBe("inputGrid");

    expect(inputGrid.rows).toHaveLength(9);
    // Check that it has the basic voter and vote count rows
    expect(inputGrid.rows.some((row) => row.path === "voters_counts.poll_card_count")).toBe(true);
    expect(inputGrid.rows.some((row) => row.path === "votes_counts.total_votes_cast_count")).toBe(true);
    // Check that it has the correct amount of political group rows
    expect(
      inputGrid.rows.filter((row) => row.path.startsWith("votes_counts.political_group_total_votes.")).length,
    ).toBe(2);
  });

  test("should have correct section number", () => {
    expect(createVotersAndVotesSection("CSOFirstSession", electionMockData).sectionNumber).toBe("B1-3.1 en 3.2");
    expect(createVotersAndVotesSection("CSONextSession", electionMockData).sectionNumber).toBe("B1-2.1 en 2.2");
  });

  test("should have autoFocusInput on first row", () => {
    const votersAndVotesSection = createVotersAndVotesSection(model, electionMockData);
    const inputGrid = votersAndVotesSection.subsections[0] as InputGridSubsection;
    expect(inputGrid.type).toBe("inputGrid");

    expect(inputGrid.rows[0]?.autoFocusInput).toBe(true);
  });

  test("should have correct row codes", () => {
    const votersAndVotesSection = createVotersAndVotesSection(model, electionMockData);
    const inputGrid = votersAndVotesSection.subsections[0] as InputGridSubsection;
    expect(inputGrid.type).toBe("inputGrid");

    const codes = inputGrid.rows.map((row) => row.code);
    expect(codes).toEqual(["A", "B", "D", "E.1", "E.2", "E", "F", "G", "H"]);
  });
});

describe("differencesSection", () => {
  test("should have correct structure", () => {
    expect(differencesSection(model).id).toBe("differences_counts");
    expect(differencesSection(model).subsections).toHaveLength(3);
    expect(differencesSection(model).subsections[0]?.type).toBe("checkboxes");
    expect(differencesSection(model).subsections[1]?.type).toBe("inputGrid");
    expect(differencesSection(model).subsections[2]?.type).toBe("checkboxes");
  });

  test("should have correct section number", () => {
    expect(differencesSection("CSOFirstSession").sectionNumber).toBe("B1-3.3");
    expect(differencesSection("CSONextSession").sectionNumber).toBe("B1-2.3");
  });

  test("should have all differences count fields", () => {
    const inputGrid = differencesSection(model).subsections[1] as InputGridSubsection;
    expect(inputGrid.type).toBe("inputGrid");

    expect(inputGrid.rows.map((row) => row.path)).toEqual([
      "differences_counts.more_ballots_count",
      "differences_counts.fewer_ballots_count",
    ]);
  });

  test("should have correct row codes", () => {
    const differencesSectionInputGrid = differencesSection(model).subsections[1] as InputGridSubsection;
    expect(differencesSectionInputGrid.type).toBe("inputGrid");
    expect(differencesSectionInputGrid.rows.map((row) => row.code)).toEqual(["I", "J"]);
  });

  test("should not have autoFocusInput on first row because it is not the first section", () => {
    const differencesSectionInputGrid = differencesSection(model).subsections[1] as InputGridSubsection;
    expect(differencesSectionInputGrid.type).toBe("inputGrid");
    expect(differencesSectionInputGrid.rows[0]!.autoFocusInput).not.toBe(true);
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
      const politicalGroup = electionMockData.political_groups[groupIndex]!;
      const inputGrid = section.subsections[0] as InputGridSubsection;
      expect(inputGrid.type).toEqual("inputGrid");

      const expectedRows = politicalGroup.candidates.length + 1; // candidates + total
      expect(inputGrid.rows).toHaveLength(expectedRows);

      // Check candidate rows
      politicalGroup.candidates.forEach((candidate, candidateIndex) => {
        const row =
          section.subsections[0]?.type === "inputGrid" ? section.subsections[0].rows[candidateIndex] : undefined;
        expect(row?.code).toBe(candidate.number.toString());
        expect(row?.path).toBe(`political_group_votes.${groupIndex}.candidate_votes.${candidateIndex}.votes`);
      });

      // Check total row
      const totalRow = inputGrid.rows[inputGrid.rows.length - 1]!;
      expect(totalRow.path).toBe(`political_group_votes.${groupIndex}.total`);
      expect(totalRow.isListTotal).toBe(true);
    });
  });

  test("should set autoFocusInput on first candidate", () => {
    const sections = createPoliticalGroupSections(electionMockData);

    sections.forEach((section) => {
      const inputGrid = section.subsections[0] as InputGridSubsection;
      expect(inputGrid.type).toEqual("inputGrid");

      expect(inputGrid.rows[0]?.autoFocusInput).toBe(true);
      // Other rows should not have autoFocus
      for (let i = 1; i < inputGrid.rows.length; i++) {
        expect(inputGrid.rows[i]?.autoFocusInput).toBeFalsy();
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

    const inputGrid = sections[0]!.subsections[0] as InputGridSubsection;
    expect(inputGrid.type).toEqual("inputGrid");

    // Should have separator after 25th candidate (index 24)
    expect(inputGrid.rows[24]?.addSeparator).toBe(true);
    // Should not have separator on last candidate (index 29)
    expect(inputGrid.rows[29]?.addSeparator).toBeFalsy();
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

    const inputGrid = sections[0]!.subsections[0] as InputGridSubsection;
    expect(inputGrid.type).toEqual("inputGrid");

    // Should only have the total row
    expect(inputGrid.rows).toHaveLength(1);
    expect(inputGrid.rows[0]?.isListTotal).toBe(true);
  });
});

describe("getDataEntryStructure", () => {
  test("should return all sections in correct order for CSOFirstSession", () => {
    const expectedSectionIds = [
      "extra_investigation",
      "counting_differences_polling_station",
      "voters_votes_counts",
      "differences_counts",
      ...electionMockData.political_groups.map((pg) => `political_group_votes_${pg.number}`),
    ];

    const structure = getDataEntryStructure("CSOFirstSession", electionMockData);

    expect(structure.map((section) => section.id)).toStrictEqual(expectedSectionIds);
  });

  test("should return all sections in correct order for CSONextSession", () => {
    const expectedSectionIds = [
      "voters_votes_counts",
      "differences_counts",
      ...electionMockData.political_groups.map((pg) => `political_group_votes_${pg.number}`),
    ];

    const structure = getDataEntryStructure("CSONextSession", electionMockData);

    expect(structure.map((section) => section.id)).toStrictEqual(expectedSectionIds);
  });
});
