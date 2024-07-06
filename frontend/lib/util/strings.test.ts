import { expect, describe, test } from "vitest";
import { ellipsis } from "./strings";

describe("Strings util", () => {
  test.each([
    ["test", "test", 20],
    ["test", "...", 2],
    ["aaaaaaaxxx", "aaaa...", 7],
    ["", "", 20],
  ])("ellipsis %s as %s", (input: string, expected: string, maxLength: number) => {
    expect(ellipsis(input, maxLength)).equals(expected);
  });
});
