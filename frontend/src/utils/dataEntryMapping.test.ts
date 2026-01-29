import { describe, expect, test } from "vitest";
import { emptyPollingStationResults } from "@/testing/api-mocks/DataEntryMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import type { DataEntrySection } from "@/types/types";
import {
  correctedValue,
  determineCorrections,
  getValueAtPath,
  mapResultsToSectionValues,
  mapSectionValues,
  setValueAtPath,
  stringRepresentsInteger,
} from "./dataEntryMapping";
import { createVotersAndVotesSection, differencesSection } from "./dataEntryStructure";

// Helper function to create a checkbox section for testing
const createCheckboxesSection = (): DataEntrySection => {
  // Use TypeScript `as` for testing
  return {
    id: "test",
    title: "test",
    short_title: "test",
    subsections: [
      {
        type: "checkboxes",
        short_title: "test",
        error_path: "test",
        error_message: "error",
        options: [
          {
            path: "test.yes",
            label: "yes",
            short_label: "yes",
          },
          {
            path: "test.no",
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
  return {
    id: "test",
    title: "test",
    short_title: "test",
    subsections: [
      {
        type: "radio",
        short_title: "test",
        error: "error",
        path: "test",
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
    const current = { test: null };
    const formValues = { test: input };

    const result = mapSectionValues(current, formValues, radioSection);

    expect(result.test).toBe(expected);
  });

  test("should use section info to distinguish radio vs inputGrid fields", () => {
    const current = {
      test: null,
      test2: null,
    };
    const formValues = {
      test: "true", // Radio field - should become boolean
      test2: "456", // InputGrid field - should be deformatted to number
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
          rows: [{ code: "A", path: "test2", title: "Test Title" }],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, testSection);

    expect(result.test).toBe(true); // Radio test field becomes boolean
    expect(result.test2).toBe(456); // InputGrid field gets deformatted to number
  });

  test("should handle numbers correctly when section info is provided", () => {
    const current = emptyPollingStationResults();
    const formValues = {
      "voters_counts.poll_card_count": "1234", // Number for inputGrid
      "voters_counts.proxy_certificate_count": "2567", // Another number for inputGrid
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

    expect(result.voters_counts.poll_card_count).toBe(1234); // Should be converted to number
    expect(result.voters_counts.proxy_certificate_count).toBe(2567); // Should be converted to number
  });

  test("should handle voters_counts fields", () => {
    const current = emptyPollingStationResults();
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
    const current = emptyPollingStationResults();
    const formValues = {
      "votes_counts.total_votes_candidates_count": "200",
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
            { code: "A", path: "votes_counts.total_votes_candidates_count", title: "Test Title" },
            { code: "B", path: "votes_counts.blank_votes_count", title: "Test Title" },
            { code: "C", path: "votes_counts.invalid_votes_count", title: "Test Title" },
            { code: "D", path: "votes_counts.total_votes_cast_count", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, votesCountsSection);

    expect(result.votes_counts.total_votes_candidates_count).toBe(200);
    expect(result.votes_counts.blank_votes_count).toBe(5);
    expect(result.votes_counts.invalid_votes_count).toBe(3);
    expect(result.votes_counts.total_votes_cast_count).toBe(208);
  });

  test("should handle differences_counts fields", () => {
    const current = emptyPollingStationResults();
    const formValues = {
      "differences_counts.more_ballots_count": "2",
      "differences_counts.fewer_ballots_count": "1",
    };

    const differencesCountsSection: DataEntrySection = {
      id: "differences_counts",
      title: "Differences Counts Section",
      short_title: "Differences Counts",
      subsections: [
        {
          type: "checkboxes",
          title: "Test title",
          short_title: "Test title",
          error_path: "Test title",
          error_message: "Test title",
          options: [
            {
              path: "differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast",
              label: "Test Title",
              short_label: "Test short title",
            },
            {
              path: "differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters",
              label: "Test Title",
              short_label: "Test short title",
            },
            {
              path: "differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters",
              label: "Test Title",
              short_label: "Test short title",
            },
          ],
        },
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "differences_counts.more_ballots_count", title: "Test Title" },
            { code: "B", path: "differences_counts.fewer_ballots_count", title: "Test Title" },
          ],
        },
        {
          type: "checkboxes",
          title: "Test title",
          short_title: "Test title",
          error_path: "Test title",
          error_message: "Test title",
          options: [
            {
              path: "differences_counts.difference_completely_accounted_for.yes",
              label: "Test Title",
              short_label: "Test short title",
            },
            {
              path: "differences_counts.difference_completely_accounted_for.no",
              label: "Test Title",
              short_label: "Test short title",
            },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, differencesCountsSection);

    expect(result.differences_counts.more_ballots_count).toBe(2);
    expect(result.differences_counts.fewer_ballots_count).toBe(1);
  });

  test("should handle political_group_votes candidate votes", () => {
    const current = emptyPollingStationResults();
    const formValues = {
      "political_group_votes.0.candidate_votes.0.votes": "25",
      "political_group_votes.0.candidate_votes.1.votes": "15",
      "political_group_votes.0.total": "40",
      "political_group_votes.1.candidate_votes.0.votes": "30",
      "political_group_votes.1.candidate_votes.1.votes": "20",
      "political_group_votes.1.total": "50",
    };

    const politicalGroupCandidateVotesSection: DataEntrySection = {
      id: "political_group_votes_1",
      title: "Political Group Votes Section",
      short_title: "Political Group Votes",
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          rows: [
            { code: "A", path: "political_group_votes.0.candidate_votes.0.votes", title: "Test Title" },
            { code: "B", path: "political_group_votes.0.candidate_votes.1.votes", title: "Test Title" },
            { code: "C", path: "political_group_votes.0.total", title: "Test Title" },
            { code: "D", path: "political_group_votes.1.candidate_votes.0.votes", title: "Test Title" },
            { code: "E", path: "political_group_votes.1.candidate_votes.1.votes", title: "Test Title" },
            { code: "F", path: "political_group_votes.1.total", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, politicalGroupCandidateVotesSection);

    expect(result.political_group_votes).toHaveLength(2);
    expect(result.political_group_votes[0]?.candidate_votes[0]?.votes).toBe(25);
    expect(result.political_group_votes[0]?.candidate_votes[1]?.votes).toBe(15);
    expect(result.political_group_votes[0]?.total).toBe(40);
    expect(result.political_group_votes[1]?.candidate_votes[0]?.votes).toBe(30);
    expect(result.political_group_votes[1]?.candidate_votes[1]?.votes).toBe(20);
    expect(result.political_group_votes[1]?.total).toBe(50);
  });

  test("should handle numbers", () => {
    const current = emptyPollingStationResults();
    const formValues = {
      "voters_counts.poll_card_count": "1234",
      "votes_counts.total_votes_candidates_count": "2567",
      "political_group_votes.0.candidate_votes.0.votes": "89",
    };

    const numbersSection: DataEntrySection = {
      id: "voters_votes_counts",
      title: "Numbers Section",
      short_title: "Numbers",
      subsections: [
        {
          type: "inputGrid",
          headers: ["field", "counted_number", "description"],
          rows: [
            { code: "A", path: "voters_counts.poll_card_count", title: "Test Title" },
            { code: "B", path: "votes_counts.total_votes_candidates_count", title: "Test Title" },
            { code: "C", path: "political_group_votes.0.candidate_votes.0.votes", title: "Test Title" },
          ],
        },
      ],
    };

    const result = mapSectionValues(current, formValues, numbersSection);

    expect(result.voters_counts.poll_card_count).toBe(1234);
    expect(result.votes_counts.total_votes_candidates_count).toBe(2567);
    expect(result.political_group_votes[0]?.candidate_votes[0]?.votes).toBe(89);
  });

  test("should handle empty values as 0", () => {
    const current = emptyPollingStationResults();
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

  test("should handle checkboxes subsection", () => {
    const current = { test: { yes: null, no: null } };
    const formValues = {
      "test.yes": "true",
      "test.no": "false",
    };

    const result = mapSectionValues(current, formValues, createCheckboxesSection());
    expect(result.test.yes).toBe(true);
    expect(result.test.no).toBe(false);
  });
});

describe("mapResultsToSectionValues", () => {
  test.each([
    { input: true, expected: "true", description: "true" },
    { input: false, expected: "false", description: "false" },
    { input: undefined, expected: "", description: "undefined" },
  ])("should handle radio as $description", ({ input, expected }) => {
    const results = { test: input };

    const testSectionWithRadio: DataEntrySection = {
      id: "test_section",
      title: "Test Section",
      short_title: "Test",
      subsections: [
        {
          type: "radio",
          short_title: "test",
          path: "test",
          error: "error",
          options: [],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(testSectionWithRadio, results);

    expect(formValues.test).toBe(expected);
  });

  test("should extract voters_votes_counts section fields", () => {
    const results = emptyPollingStationResults();
    results.voters_counts = {
      poll_card_count: 123,
      proxy_certificate_count: 45,
      total_admitted_voters_count: 235,
    };
    results.votes_counts = {
      political_group_total_votes: [
        { number: 1, total: 50 },
        { number: 2, total: 150 },
      ],
      total_votes_candidates_count: 200,
      blank_votes_count: 5,
      invalid_votes_count: 3,
      total_votes_cast_count: 208,
    };

    const section = createVotersAndVotesSection("CSOFirstSession", electionMockData);
    const formValues = mapResultsToSectionValues(section, results);

    // Check voters_counts fields
    expect(formValues["voters_counts.poll_card_count"]).toBe("123");
    expect(formValues["voters_counts.proxy_certificate_count"]).toBe("45");
    expect(formValues["voters_counts.total_admitted_voters_count"]).toBe("235");

    // Check votes_counts fields
    expect(formValues["votes_counts.political_group_total_votes.0.total"]).toBe("50");
    expect(formValues["votes_counts.political_group_total_votes.1.total"]).toBe("150");
    expect(formValues["votes_counts.total_votes_candidates_count"]).toBe("200");
    expect(formValues["votes_counts.blank_votes_count"]).toBe("5");
    expect(formValues["votes_counts.invalid_votes_count"]).toBe("3");
    expect(formValues["votes_counts.total_votes_cast_count"]).toBe("208");
  });

  test("should extract differences_counts section fields", () => {
    const results = emptyPollingStationResults();
    results.differences_counts = {
      more_ballots_count: 2,
      fewer_ballots_count: 1,
      compare_votes_cast_admitted_voters: {
        admitted_voters_equal_votes_cast: false,
        votes_cast_greater_than_admitted_voters: false,
        votes_cast_smaller_than_admitted_voters: false,
      },
      difference_completely_accounted_for: {
        no: false,
        yes: false,
      },
    };

    const section = differencesSection("CSOFirstSession");
    const formValues = mapResultsToSectionValues(section, results);
    expect(formValues["differences_counts.more_ballots_count"]).toBe("2");
    expect(formValues["differences_counts.fewer_ballots_count"]).toBe("1");
    expect(formValues["differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast"]).toBe(
      "false",
    );
    expect(
      formValues["differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters"],
    ).toBe("false");
    expect(
      formValues["differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters"],
    ).toBe("false");
    expect(formValues["differences_counts.difference_completely_accounted_for.no"]).toBe("false");
    expect(formValues["differences_counts.difference_completely_accounted_for.yes"]).toBe("false");
  });

  test("should extract political group section fields", () => {
    const results = emptyPollingStationResults();
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
            { path: "political_group_votes.0.candidate_votes.0.votes", title: "Test Title" },
            { path: "political_group_votes.0.candidate_votes.1.votes", title: "Test Title" },
            { path: "political_group_votes.0.total", title: "Test Title" },
          ],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(politicalGroupSection, results);

    expect(formValues["political_group_votes.0.candidate_votes.0.votes"]).toBe("25");
    expect(formValues["political_group_votes.0.candidate_votes.1.votes"]).toBe("15");
    expect(formValues["political_group_votes.0.total"]).toBe("40");
  });

  test("should handle missing political group data", () => {
    const results = emptyPollingStationResults();

    const politicalGroupSection: DataEntrySection = {
      id: "political_group_votes_1",
      title: "Political Group Votes",
      short_title: "Political Group Votes",
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          rows: [
            { path: "political_group_votes.0.candidate_votes.0.votes", title: "Test Title" },
            { path: "political_group_votes.0.candidate_votes.1.votes", title: "Test Title" },
            { path: "political_group_votes.0.total", title: "Test Title" },
          ],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(politicalGroupSection, results);

    expect(formValues["political_group_votes.0.candidate_votes.0.votes"]).toBe("");
    expect(formValues["political_group_votes.0.candidate_votes.1.votes"]).toBe("");
    expect(formValues["political_group_votes.0.total"]).toBe("");
  });

  test("should handle sparse political group arrays", () => {
    const results = emptyPollingStationResults();
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
            { path: "political_group_votes.2.candidate_votes.5.votes", title: "Test Title" },
            { path: "political_group_votes.2.total", title: "Test Title" },
          ],
        },
      ],
    };

    const formValues = mapResultsToSectionValues(politicalGroupSection, results);

    expect(formValues["political_group_votes.2.candidate_votes.5.votes"]).toBe("12");
    expect(formValues["political_group_votes.2.total"]).toBe("12");
  });

  test("should handle zero values", () => {
    const results = emptyPollingStationResults();

    const section = createVotersAndVotesSection("CSOFirstSession", electionMockData);
    const formValues = mapResultsToSectionValues(section, results);
    expect(formValues["voters_counts.poll_card_count"]).toBe("");
    expect(formValues["votes_counts.blank_votes_count"]).toBe("");
  });

  test("should handle section with empty subsections", () => {
    const results = emptyPollingStationResults();
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
    const results = emptyPollingStationResults();
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
    const results = {
      test: true,
      voters_counts: {
        poll_card_count: 100,
      },
    };

    const mixedSection: DataEntrySection = {
      id: "test",
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
    expect(formValues.test).toBe("true");
    expect(formValues["voters_counts.poll_card_count"]).toBe("100");
  });

  test("should extract checkboxes boolean values to string form", () => {
    const checkboxesSection = createCheckboxesSection();
    // Test with both true values
    const results = { test: { yes: true, no: true } };

    let formValues = mapResultsToSectionValues(checkboxesSection, results);
    expect(formValues["test.yes"]).toBe("true");
    expect(formValues["test.no"]).toBe("true");

    // Test with both false values
    results.test = { yes: false, no: false };

    formValues = mapResultsToSectionValues(checkboxesSection, results);
    expect(formValues["test.yes"]).toBe("false");
    expect(formValues["test.no"]).toBe("false");

    // Test with mixed values
    results.test = { yes: true, no: false };

    formValues = mapResultsToSectionValues(checkboxesSection, results);
    expect(formValues["test.yes"]).toBe("true");
    expect(formValues["test.no"]).toBe("false");
  });
});

describe("correctedValue", () => {
  test("undefined previousValue return correction", () => {
    expect(correctedValue(undefined, "10")).toEqual("10");
  });

  test("empty correction returns previous value", () => {
    expect(correctedValue("10", "")).toEqual("10");
  });

  test("empty correction and previous value returns empty", () => {
    expect(correctedValue("", "")).toEqual("");
  });

  test("correction not empty return correction", () => {
    expect(correctedValue("10", "20")).toEqual("20");
  });
});

describe("determineCorrections", () => {
  test("identical previous and current results in empty correction", () => {
    expect(determineCorrections({ a: "10" }, { a: "10" })).toEqual({ a: "" });
  });

  test("different previous and current results in correction", () => {
    expect(determineCorrections({ a: "10" }, { a: "20" })).toEqual({ a: "20" });
  });

  test("filled previous and empty current results in zero correction", () => {
    expect(determineCorrections({ a: "10" }, { a: "" })).toEqual({ a: "0" });
  });
});

describe("stringRepresentsInteger", () => {
  test.each([
    { input: "42", expected: true },
    { input: "0", expected: true },
    { input: "-7", expected: false },
    { input: "3.14", expected: false },
    { input: "mand", expected: false },
    { input: "2a", expected: false },
    { input: "a2", expected: false },
    { input: "", expected: false },
    { input: "   ", expected: false },
    { input: "123a", expected: false },
  ])("should determine if $input represents an integer", ({ input, expected }) => {
    const result = stringRepresentsInteger(input);
    expect(result).toBe(expected);
  });
});

describe("getValueAtPath", () => {
  const data = {
    types: {
      string: "hello",
      number: 42,
      boolean: true,
      object: { key: "value" },
      array: [{ item: 100 }, { item: 200 }],
    },
    paths: {
      nested: { level1: { level2: { value: "deep" } } },
      arrayAccess: [{ value: "first" }, { value: "second" }],
    },
  };

  test.each([
    { path: "types.string", expected: "hello" },
    { path: "types.number", expected: 42 },
    { path: "types.boolean", expected: true },
    { path: "types.object", expected: undefined }, // Not a PathValue
    { path: "types.array", expected: undefined }, // Not a PathValue
    { path: "types.array.0.item", expected: 100 },
    { path: "types.array.1.item", expected: 200 },
    { path: "paths.nested.level1.level2.value", expected: "deep" },
    { path: "paths.arrayAccess.0.value", expected: "first" },
    { path: "paths.arrayAccess.1.value", expected: "second" },
    { path: "paths.arrayAccess.2.value", expected: Error }, // Out of bounds
    { path: "non.existent.path", expected: Error }, // Non-existent path
  ] satisfies Array<{ path: string; expected: unknown }>)("$path", ({ path, expected }) => {
    try {
      expect(getValueAtPath(data, path)).toEqual(expected);
    } catch (e) {
      if (expected !== Error) throw e;

      expect(e).toBeInstanceOf(Error);
    }
  });
});

describe("setValueAtPath", () => {
  const data = emptyPollingStationResults();

  test.each([
    {
      path: "voters_counts.poll_card_count",
      value: "1500",
      type: "number",
      expected: 1500,
    },
    {
      path: "extra_investigation.extra_investigation_other_reason.yes",
      value: "true",
      type: "boolean",
      expected: true,
    },
    {
      path: "political_group_votes.0.candidate_votes.0.votes",
      value: "75",
      type: "number",
      expected: 75,
    },
    {
      path: "political_group_votes.1",
      value: "75",
      type: "number",
      expected: 75,
    },
    {
      // Out of bounds
      path: "political_group_votes.1.candidate_votes.123.votes",
      value: "75",
      type: "number",
      expected: Error,
    },
    {
      // Non-existent path
      path: "non.existent.path",
      value: "75",
      type: "number",
      expected: Error,
    },
  ] satisfies Array<{
    path: string;
    value: string;
    type: "boolean" | "number" | undefined;
    expected: unknown;
  }>)("$path", ({ path, value, type, expected }) => {
    try {
      setValueAtPath(data, path, value, type);
      expect(getValueAtPath(data, path)).toEqual(expected);
    } catch (e: unknown) {
      if ((e as Error).name === "AssertionError" || expected !== Error) throw e;

      expect(e).toBeInstanceOf(Error);
    }
  });
});
