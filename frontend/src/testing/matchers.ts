import type { ExpectationResult } from "@vitest/expect";

function isTextNode(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE;
}

/**
 * Get the text content, adding spaces between different child elements to make sure contents such as
 * `<span>text</span><Badge />` and `<DisplayFractions />` can be tested in a more readable way.
 */
function getTextContent(node: Node): string {
  const childNodes = Array.from(node.childNodes);
  if (isTextNode(node) || childNodes.every(isTextNode)) {
    return node.textContent?.trim() || "";
  }

  return childNodes.map(getTextContent).filter(Boolean).join(" ").trim();
}

function toHaveTableContent(htmlElement: unknown, expected: string[][]): ExpectationResult {
  if (!(htmlElement instanceof HTMLTableElement)) {
    return {
      pass: false,
      message: () => `Expected an HTMLTableElement, but received ${htmlElement?.constructor?.name || "unknown"}.`,
    };
  }

  const actual = Array.from(htmlElement.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th, td")).map(getTextContent),
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
