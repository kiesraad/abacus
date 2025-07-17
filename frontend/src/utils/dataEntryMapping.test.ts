import { describe, expect, test } from "vitest";

import { PollingStationResults } from "@/types/generated/openapi";
import { DataEntrySection, FormSectionId, PollingStationResultsPath } from "@/types/types";

import { mapResultsToSectionValues, mapSectionValues } from "./dataEntryMapping";
import { differencesSection, votersAndVotesSection } from "./dataEntryStructure";

// Helper function to create a base PollingStationResults object for testing
const createBasePollingStationResults = (): PollingStationResults => ({
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
  voters_counts: {
    poll_card_count: 0,
    proxy_certificate_count: 0,
    total_admitted_voters_count: 0,
  },
  votes_counts: {
    votes_candidates_count: 0,
    blank_votes_count: 0,
    invalid_votes_count: 0,
    total_votes_cast_count: 0,
  },
});

// Helper function to create a checkbox section for testing
const createCheckboxesSection = (): DataEntrySection => {
  // Use TypeScript `as` for testing
  return {
    id: "test" as FormSectionId,
    title: "test",
    short_title: "test",
    subsections: [
      {
        type: "checkboxes",
        short_title: "test",
        error_path: "test" as PollingStationResultsPath,
        error_message: "error",
        options: [
          {
            path: "test.yes" as PollingStationResultsPath,
            label: "yes",
            short_label: "yes",
          },
          {
            path: "test.no" as PollingStationResultsPath,
            label: "no",
            short_label: "no",
          },
        ],
      },
    ],
  };
};

// Helper function to create a radio section for testing
const createRadioSection = (): DataEntrySection => {
  // Use TypeScript `as` for testing
  return {
    id: "test" as FormSectionId,
    title: "test",
    short_title: "test",
    subsections: [
      {
        type: "radio",
        short_title: "test",
        error: "error",
        path: "test" as PollingStationResultsPath,
        valueType: "boolean",
        options: [
          {
            value: "true",
            label: "yes",
            short_label: "yes",
          },
          {
            value: "false",
            label: "no",
            short_label: "no",
          },
        ],
      },
    ],
  };
};

describe("mapSectionValues", () => {
  test.each([
    { input: "true", expected: true, description: "true" },
    { input: "false", expected: false, description: "false" },
    { input: "", expected: undefined, description: "empty" },
  ])("should handle radio $description", ({ input, expected }) => {
    const radioSection = createRadioSection();
    const current = createBasePollingStationResults();
    const formValues = { test: input };

    const result = mapSectionValues(current, formValues, radioSection);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    expect((result as any).test).toBe(expected);
  });

  test("should use section info to distinguish radio vs inputGrid fields", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      test: "true", // Radio field - should become boolean
      "voters_counts.poll_card_count": "456", // InputGrid field - should be deformatted to number
    };

    const testSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Test Section",
      short_title: "Test",
      subsections: [
        ...createRadioSection().subsections,
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [{ code: "A", path: "voters_counts.poll_card_count", title: "Test Title" }],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, testSection);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    expect((result as any).test).toBe(true); // Radio test field becomes boolean
    expect(result.voters_counts.poll_card_count).toBe(456); // InputGrid field gets deformatted to number
  });

  test("should handle formatted numbers correctly when section info is provided", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "voters_counts.poll_card_count": "1.234", // Formatted number for inputGrid
      "voters_counts.proxy_certificate_count": "2.567", // Another formatted number for inputGrid
    };

    const testSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Test Section",
      short_title: "Test",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "voters_counts.poll_card_count", title: "Test Title" },
            { code: "B", path: "voters_counts.proxy_certificate_count", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, testSection);

    expect(result.voters_counts.poll_card_count).toBe(1234); // Should be deformatted to number
    expect(result.voters_counts.proxy_certificate_count).toBe(2567); // Should be deformatted to number
  });

  test("should handle mixed field types when section is provided", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      test: "true", // Boolean field - special case
      "voters_counts.poll_card_count": "1.234", // Numeric value - should be deformatted
      "differences_counts.more_ballots_count": "5", // Another numeric value
    };

    const mixedSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Mixed Section",
      short_title: "Mixed",
      subsections: [
        ...createRadioSection().subsections,
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "voters_counts.poll_card_count", title: "Test Title" },
            { code: "B", path: "differences_counts.more_ballots_count", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, mixedSection);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    expect((result as any).test).toBe(true);
    expect(result.voters_counts.poll_card_count).toBe(1234);
    expect(result.differences_counts.more_ballots_count).toBe(5);
  });

  test("should handle voters_counts fields", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "voters_counts.poll_card_count": "123",
      "voters_counts.proxy_certificate_count": "45",
      "voters_counts.total_admitted_voters_count": "235",
    };

    const votersCountsSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Voters Counts Section",
      short_title: "Voters Counts",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "voters_counts.poll_card_count", title: "Test Title" },
            { code: "B", path: "voters_counts.proxy_certificate_count", title: "Test Title" },
            { code: "D", path: "voters_counts.total_admitted_voters_count", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, votersCountsSection);

    expect(result.voters_counts.poll_card_count).toBe(123);
    expect(result.voters_counts.proxy_certificate_count).toBe(45);
    expect(result.voters_counts.total_admitted_voters_count).toBe(235);
  });

  test("should handle votes_counts fields", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "votes_counts.votes_candidates_count": "200",
      "votes_counts.blank_votes_count": "5",
      "votes_counts.invalid_votes_count": "3",
      "votes_counts.total_votes_cast_count": "208",
    };

    const votesCountsSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Votes Counts Section",
      short_title: "Votes Counts",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "votes_counts.votes_candidates_count", title: "Test Title" },
            { code: "B", path: "votes_counts.blank_votes_count", title: "Test Title" },
            { code: "C", path: "votes_counts.invalid_votes_count", title: "Test Title" },
            { code: "D", path: "votes_counts.total_votes_cast_count", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, votesCountsSection);

    expect(result.votes_counts.votes_candidates_count).toBe(200);
    expect(result.votes_counts.blank_votes_count).toBe(5);
    expect(result.votes_counts.invalid_votes_count).toBe(3);
    expect(result.votes_counts.total_votes_cast_count).toBe(208);
  });

  test("should handle differences_counts fields", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "differences_counts.more_ballots_count": "2",
      "differences_counts.fewer_ballots_count": "1",
      "differences_counts.unreturned_ballots_count": "0",
      "differences_counts.too_few_ballots_handed_out_count": "0",
      "differences_counts.too_many_ballots_handed_out_count": "1",
      "differences_counts.other_explanation_count": "0",
      "differences_counts.no_explanation_count": "2",
    };

    const differencesCountsSection: DataEntrySection = {
      id: "differences_counts",
      title: "Differences Counts Section",
      short_title: "Differences Counts",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "differences_counts.more_ballots_count", title: "Test Title" },
            { code: "B", path: "differences_counts.fewer_ballots_count", title: "Test Title" },
            { code: "C", path: "differences_counts.unreturned_ballots_count", title: "Test Title" },
            { code: "D", path: "differences_counts.too_few_ballots_handed_out_count", title: "Test Title" },
            { code: "E", path: "differences_counts.too_many_ballots_handed_out_count", title: "Test Title" },
            { code: "F", path: "differences_counts.other_explanation_count", title: "Test Title" },
            { code: "G", path: "differences_counts.no_explanation_count", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, differencesCountsSection);

    expect(result.differences_counts.more_ballots_count).toBe(2);
    expect(result.differences_counts.fewer_ballots_count).toBe(1);
    expect(result.differences_counts.unreturned_ballots_count).toBe(0);
    expect(result.differences_counts.too_few_ballots_handed_out_count).toBe(0);
    expect(result.differences_counts.too_many_ballots_handed_out_count).toBe(1);
    expect(result.differences_counts.other_explanation_count).toBe(0);
    expect(result.differences_counts.no_explanation_count).toBe(2);
  });

  test("should handle political_group_votes candidate votes", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "political_group_votes[0].candidate_votes[0].votes": "25",
      "political_group_votes[0].candidate_votes[1].votes": "15",
      "political_group_votes[0].total": "40",
      "political_group_votes[1].candidate_votes[0].votes": "30",
      "political_group_votes[1].candidate_votes[1].votes": "20",
      "political_group_votes[1].total": "50",
    };

    const politicalGroupVotesSection: DataEntrySection = {
      id: "political_group_votes_1",
      title: "Political Group Votes Section",
      short_title: "Political Group Votes",
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          rows: [
            { code: "A", path: "political_group_votes[0].candidate_votes[0].votes", title: "Test Title" },
            { code: "B", path: "political_group_votes[0].candidate_votes[1].votes", title: "Test Title" },
            { code: "C", path: "political_group_votes[0].total", title: "Test Title" },
            { code: "D", path: "political_group_votes[1].candidate_votes[0].votes", title: "Test Title" },
            { code: "E", path: "political_group_votes[1].candidate_votes[1].votes", title: "Test Title" },
            { code: "F", path: "political_group_votes[1].total", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, politicalGroupVotesSection);

    expect(result.political_group_votes).toHaveLength(2);
    expect(result.political_group_votes[0]?.candidate_votes).toHaveLength(2);
    expect(result.political_group_votes[0]?.candidate_votes[0]?.votes).toBe(25);
    expect(result.political_group_votes[0]?.candidate_votes[1]?.votes).toBe(15);
    expect(result.political_group_votes[0]?.total).toBe(40);
    expect(result.political_group_votes[1]?.candidate_votes).toHaveLength(2);
    expect(result.political_group_votes[1]?.candidate_votes[0]?.votes).toBe(30);
    expect(result.political_group_votes[1]?.candidate_votes[1]?.votes).toBe(20);
    expect(result.political_group_votes[1]?.total).toBe(50);
  });

  test("should handle sparse political_group_votes arrays", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "political_group_votes[2].candidate_votes[5].votes": "12",
      "political_group_votes[2].total": "12",
    };

    const sparsePoliticalGroupVotesSection: DataEntrySection = {
      id: "political_group_votes_1",
      title: "Sparse Political Group Votes Section",
      short_title: "Sparse Political Group Votes",
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          rows: [
            { code: "A", path: "political_group_votes[2].candidate_votes[5].votes", title: "Test Title" },
            { code: "B", path: "political_group_votes[2].total", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, sparsePoliticalGroupVotesSection);

    expect(result.political_group_votes).toHaveLength(3);
    expect(result.political_group_votes[2]?.candidate_votes).toHaveLength(6);
    expect(result.political_group_votes[2]?.candidate_votes[5]?.votes).toBe(12);
    expect(result.political_group_votes[2]?.total).toBe(12);
  });

  test("should handle formatted numbers by deformatting them", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "voters_counts.poll_card_count": "1.234",
      "votes_counts.votes_candidates_count": "2.567",
      "political_group_votes[0].candidate_votes[0].votes": "89",
    };

    const formattedNumbersSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Formatted Numbers Section",
      short_title: "Formatted Numbers",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "voters_counts.poll_card_count", title: "Test Title" },
            { code: "B", path: "votes_counts.votes_candidates_count", title: "Test Title" },
            { code: "C", path: "political_group_votes[0].candidate_votes[0].votes", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, formattedNumbersSection);

    expect(result.voters_counts.poll_card_count).toBe(1234);
    expect(result.votes_counts.votes_candidates_count).toBe(2567);
    expect(result.political_group_votes[0]?.candidate_votes[0]?.votes).toBe(89);
  });

  test("should handle empty values as 0", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "voters_counts.poll_card_count": "",
      "votes_counts.blank_votes_count": "",
    };

    const emptyValuesSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Empty Values Section",
      short_title: "Empty Values",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "voters_counts.poll_card_count", title: "Test Title" },
            { code: "B", path: "votes_counts.blank_votes_count", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, emptyValuesSection);

    expect(result.voters_counts.poll_card_count).toBe(0);
    expect(result.votes_counts.blank_votes_count).toBe(0);
  });

  test("should preserve existing data when mapping new values", () => {
    const current = createBasePollingStationResults();
    current.voters_counts.poll_card_count = 100;
    current.political_group_votes = [
      {
        number: 1,
        candidate_votes: [{ number: 1, votes: 50 }],
        total: 50,
      },
    ];

    const formValues = {
      "voters_counts.proxy_certificate_count": "25",
      "political_group_votes[0].candidate_votes[1].votes": "30",
    };

    const preserveDataSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Preserve Data Section",
      short_title: "Preserve Data",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "voters_counts.proxy_certificate_count", title: "Test Title" },
            { code: "B", path: "political_group_votes[0].candidate_votes[1].votes", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, preserveDataSection);

    // Existing data should be preserved
    expect(result.voters_counts.poll_card_count).toBe(100);
    expect(result.political_group_votes[0]?.number).toBe(1);
    expect(result.political_group_votes[0]?.candidate_votes[0]?.votes).toBe(50);
    expect(result.political_group_votes[0]?.total).toBe(50);

    // New data should be added
    expect(result.voters_counts.proxy_certificate_count).toBe(25);
    expect(result.political_group_votes[0]?.candidate_votes[1]?.votes).toBe(30);
  });

  test("should handle checkboxes subsection", () => {
    const current = createBasePollingStationResults();
    const formValues = {
      "test.yes": "true",
      "test.no": "false",
    };

    // use `any` because real PollingStationResults doesn't have recounted.yes/recounted.no
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = mapSectionValues(current, formValues, createCheckboxesSection());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(result.test.yes).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(result.test.no).toBe(false);
  });
});

describe("mapResultsToSectionValues", () => {
  test.each([
    { input: true, expected: "true", description: "true" },
    { input: false, expected: "false", description: "false" },
    { input: undefined, expected: "", description: "undefined" },
  ])("should handle radio as $description", ({ input, expected }) => {
    const results = createBasePollingStationResults();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (results as any).test = input;

    const testSectionWithRadio: DataEntrySection = {
      id: "test_section" as FormSectionId,
      title: "Test Section",
      short_title: "Test",
      subsections: [
        {
          type: "radio",
          short_title: "test",
          path: "test" as PollingStationResultsPath,
          valueType: "boolean",
          error: "error",
          options: [],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(testSectionWithRadio, results);

    expect(formValues["test"]).toBe(expected);
  });

  test("should format only inputGrid values, not radio values", () => {
    const results = createBasePollingStationResults();
    results.voters_counts.poll_card_count = 1234; // Should be formatted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (results as any).test = true; // Should stay as string when converted

    const testSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Test Section",
      short_title: "Test",
      subsections: [
        {
          type: "radio",
          short_title: "test.short_title",
          path: "test" as PollingStationResultsPath,
          valueType: "boolean",
          error: "test.error",
          options: [],
        },
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [{ code: "A", path: "voters_counts.poll_card_count", title: "Test Title" }],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(testSection, results);

    expect(formValues["test"]).toBe("true"); // Radio value stays as string
    expect(formValues["voters_counts.poll_card_count"]).toBe("1.234"); // InputGrid value gets formatted
  });

  test("should extract voters_votes_counts section fields", () => {
    const results = createBasePollingStationResults();
    results.voters_counts = {
      poll_card_count: 123,
      proxy_certificate_count: 45,
      total_admitted_voters_count: 235,
    };
    results.votes_counts = {
      votes_candidates_count: 200,
      blank_votes_count: 5,
      invalid_votes_count: 3,
      total_votes_cast_count: 208,
    };

    const formValues = mapResultsToSectionValues(votersAndVotesSection, results);

    // Check voters_counts fields
    expect(formValues["voters_counts.poll_card_count"]).toBe("123");
    expect(formValues["voters_counts.proxy_certificate_count"]).toBe("45");
    expect(formValues["voters_counts.total_admitted_voters_count"]).toBe("235");

    // Check votes_counts fields
    expect(formValues["votes_counts.votes_candidates_count"]).toBe("200");
    expect(formValues["votes_counts.blank_votes_count"]).toBe("5");
    expect(formValues["votes_counts.invalid_votes_count"]).toBe("3");
    expect(formValues["votes_counts.total_votes_cast_count"]).toBe("208");
  });

  test("should extract differences_counts section fields", () => {
    const results = createBasePollingStationResults();
    results.differences_counts = {
      more_ballots_count: 2,
      fewer_ballots_count: 1,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 1,
      other_explanation_count: 0,
      no_explanation_count: 2,
    };

    const formValues = mapResultsToSectionValues(differencesSection, results);

    expect(formValues["differences_counts.more_ballots_count"]).toBe("2");
    expect(formValues["differences_counts.fewer_ballots_count"]).toBe("1");
    expect(formValues["differences_counts.unreturned_ballots_count"]).toBe("");
    expect(formValues["differences_counts.too_few_ballots_handed_out_count"]).toBe("");
    expect(formValues["differences_counts.too_many_ballots_handed_out_count"]).toBe("1");
    expect(formValues["differences_counts.other_explanation_count"]).toBe("");
    expect(formValues["differences_counts.no_explanation_count"]).toBe("2");
  });

  test("should extract political group section fields", () => {
    const results = createBasePollingStationResults();
    results.political_group_votes = [
      {
        number: 1,
        candidate_votes: [
          { number: 1, votes: 25 },
          { number: 2, votes: 15 },
        ],
        total: 40,
      },
      {
        number: 2,
        candidate_votes: [
          { number: 1, votes: 30 },
          { number: 2, votes: 20 },
        ],
        total: 50,
      },
    ];

    const politicalGroupSection: DataEntrySection = {
      id: "political_group_votes_1",
      title: "Political Group Votes",
      short_title: "Political Group Votes",
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          rows: [
            { path: "political_group_votes[0].candidate_votes[0].votes", title: "Test Title" },
            { path: "political_group_votes[0].candidate_votes[1].votes", title: "Test Title" },
            { path: "political_group_votes[0].total", title: "Test Title" },
          ],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(politicalGroupSection, results);

    expect(formValues["political_group_votes[0].candidate_votes[0].votes"]).toBe("25");
    expect(formValues["political_group_votes[0].candidate_votes[1].votes"]).toBe("15");
    expect(formValues["political_group_votes[0].total"]).toBe("40");
  });

  test("should handle missing political group data", () => {
    const results = createBasePollingStationResults();

    const politicalGroupSection: DataEntrySection = {
      id: "political_group_votes_1",
      title: "Political Group Votes",
      short_title: "Political Group Votes",
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          rows: [
            { path: "political_group_votes[0].candidate_votes[0].votes", title: "Test Title" },
            { path: "political_group_votes[0].candidate_votes[1].votes", title: "Test Title" },
            { path: "political_group_votes[0].total", title: "Test Title" },
          ],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(politicalGroupSection, results);

    expect(formValues["political_group_votes[0].candidate_votes[0].votes"]).toBe("");
    expect(formValues["political_group_votes[0].candidate_votes[1].votes"]).toBe("");
    expect(formValues["political_group_votes[0].total"]).toBe("");
  });

  test("should handle sparse political group arrays", () => {
    const results = createBasePollingStationResults();
    results.political_group_votes = [];
    results.political_group_votes[2] = {
      number: 3,
      candidate_votes: [],
      total: 12,
    };
    results.political_group_votes[2].candidate_votes[5] = { number: 6, votes: 12 };

    const politicalGroupSection: DataEntrySection = {
      id: "political_group_votes_3",
      title: "Political Group Votes",
      short_title: "Political Group Votes",
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          rows: [
            { path: "political_group_votes[2].candidate_votes[5].votes", title: "Test Title" },
            { path: "political_group_votes[2].total", title: "Test Title" },
          ],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(politicalGroupSection, results);

    expect(formValues["political_group_votes[2].candidate_votes[5].votes"]).toBe("12");
    expect(formValues["political_group_votes[2].total"]).toBe("12");
  });

  test("should format large numbers correctly", () => {
    const results = createBasePollingStationResults();
    results.voters_counts.poll_card_count = 1234;
    results.votes_counts.votes_candidates_count = 5678;

    const formValues = mapResultsToSectionValues(votersAndVotesSection, results);

    expect(formValues["voters_counts.poll_card_count"]).toBe("1.234");
    expect(formValues["votes_counts.votes_candidates_count"]).toBe("5.678");
  });

  test("should handle zero values", () => {
    const results = createBasePollingStationResults();

    const formValues = mapResultsToSectionValues(votersAndVotesSection, results);

    expect(formValues["voters_counts.poll_card_count"]).toBe("");
    expect(formValues["votes_counts.blank_votes_count"]).toBe("");
  });

  test("should handle section with empty subsections", () => {
    const results = createBasePollingStationResults();
    const emptySubsectionsSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Test Section",
      short_title: "Test",
      subsections: [],
    };

    const formValues = mapResultsToSectionValues(emptySubsectionsSection, results);

    expect(Object.keys(formValues).length).toBe(0);
  });

  test("should handle section with only message and heading components", () => {
    const results = createBasePollingStationResults();
    const messageSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Test Section",
      short_title: "Test",
      subsections: [
        {
          type: "message",
          message: "description",
        },
        {
          type: "heading",
          title: "empty",
        },
      ],
    };

    const formValues = mapResultsToSectionValues(messageSection, results);

    expect(Object.keys(formValues).length).toBe(0);
  });

  test("should handle mixed subsections components", () => {
    const results = createBasePollingStationResults();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (results as any).test = true;
    results.voters_counts.poll_card_count = 100;

    const mixedSection: DataEntrySection = {
      id: "test" as FormSectionId,
      title: "test",
      short_title: "test",
      subsections: [
        { type: "message", message: "description" },
        ...createRadioSection().subsections,
        { type: "heading", title: "description" },
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [{ path: "voters_counts.poll_card_count", title: "Test Title" }],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(mixedSection, results);

    expect(Object.keys(formValues).length).toBe(2);
    expect(formValues["test"]).toBe("true");
    expect(formValues["voters_counts.poll_card_count"]).toBe("100");
  });

  test("should extract checkboxes boolean values to string form", () => {
    const results = createBasePollingStationResults();
    const checkboxesSection = createCheckboxesSection();

    // Test with both true values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (results as any).test = { yes: true, no: true };

    let formValues = mapResultsToSectionValues(checkboxesSection, results);
    expect(formValues["test.yes"]).toBe("true");
    expect(formValues["test.no"]).toBe("true");

    // Test with both false values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (results as any).test = { yes: false, no: false };

    formValues = mapResultsToSectionValues(checkboxesSection, results);
    expect(formValues["test.yes"]).toBe("false");
    expect(formValues["test.no"]).toBe("false");

    // Test with mixed values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (results as any).test = { yes: true, no: false };

    formValues = mapResultsToSectionValues(checkboxesSection, results);
    expect(formValues["test.yes"]).toBe("true");
    expect(formValues["test.no"]).toBe("false");
  });
});
