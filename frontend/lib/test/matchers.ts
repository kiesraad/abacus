import type { ExpectationResult } from "@vitest/expect";

function toHaveTableContent(htmlElement: unknown, expected: string[][]): ExpectationResult {
  if (!(htmlElement instanceof HTMLTableElement)) {
    return {
      pass: false,
      message: () => `Expected an HTMLTableElement, but received ${htmlElement?.constructor?.name || "unknown"}.`,
    };
  }

  const actual = Array.from(htmlElement.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) => cell.textContent?.trim() || ""),
  );

  const pass = JSON.stringify(actual) === JSON.stringify(expected);

  return {
    pass,
    message: () =>
      pass
        ? `Expected table not to have content: ${JSON.stringify(expected)}, but it did.`
        : `Expected table to have content: ${JSON.stringify(expected)}, but got: ${JSON.stringify(actual)}`,
    actual,
    expected,
  };
}

export const matchers = {
  toHaveTableContent,
};
