import { expect, test } from "vitest";
import { fieldNameFromPath } from "./fields";

test.each([
  ["votes_counts.total_votes_cast_count", "total_votes_cast_count"],
  ["test", "test"],
  ["test1.test2.test3", "test3"],
  ["", ""],
])("fieldName from path %s as %s", (input: string, expected: string) => {
  expect(fieldNameFromPath(input)).equals(expected);
});
