import { expect, test } from "vitest";

import { fieldNameFromPath, matchValidationResultWithFormSections } from "./fields";

test.each([
  ["votes_counts.total_votes_cast_count", "total_votes_cast_count"],
  ["test", "test"],
  ["test1.test2.test3", "test3"],
  ["data.policical_group_votes[1].candidate[1].votes", "candidate-1.votes"],
  ["", ""],
])("fieldName from path %s as %s", (input: string, expected: string) => {
  expect(fieldNameFromPath(input)).equals(expected);
});

test("matchValidationResultWithFormSections", () => {
  let fields = [
    "data.votes_counts.test1",
    "data.votes_counts.test2",
    "data.voters_counts.test3",
    "data.voters_counts.test4",
  ];
  let sections = ["votes_counts", "voters_counts"];
  expect(matchValidationResultWithFormSections(fields, sections)).equals(true);

  fields = ["data.test1.val1", "data.test2.val2"];
  sections = ["test1"];

  expect(matchValidationResultWithFormSections(fields, sections)).equals(false);

  fields = ["data.political_group_votes[1].total"];
  sections = ["political_group_votes[1]"];

  expect(matchValidationResultWithFormSections(fields, sections)).equals(true);
});
