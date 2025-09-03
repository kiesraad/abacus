import { describe, expect, test } from "vitest";

import { parse } from "./format";

describe("i18n format", () => {
  test("Parse rich translations strings", () => {
    const testCases = [
      {
        input: "<p>hello <new-tag>world</new-tag></p>",
        expected: [{ tag: "p", children: ["hello <new-tag>world</new-tag>"] }],
      },
      {
        input: "<p>hello</p><ul><li>one</li><li>two</li></ul>",
        expected: [
          { tag: "p", children: ["hello"] },
          {
            tag: "ul",
            children: [
              { tag: "li", children: ["one"] },
              { tag: "li", children: ["two"] },
            ],
          },
        ],
      },
      {
        input:
          "<p>de aanduiding strijdig is met de openbare orde</p><p>de aanduiding anderszins misleidend is voor de kiezers</p>",
        expected: [
          { tag: "p", children: ["de aanduiding strijdig is met de openbare orde"] },
          { tag: "p", children: ["de aanduiding anderszins misleidend is voor de kiezers"] },
        ],
      },
      {
        input: "<ul><li><ul><li>Nest much?</li></ul></li><li>That's rookie nesting</li></ul>",
        expected: [
          {
            tag: "ul",
            children: [
              { tag: "li", children: [{ tag: "ul", children: [{ tag: "li", children: ["Nest much?"] }] }] },
              { tag: "li", children: ["That's rookie nesting"] },
            ],
          },
        ],
      },
      {
        input: "Multi\nline.\nMultiple\nlines!",
        expected: [
          "Multi",
          { tag: "br", children: [] },
          "line.",
          { tag: "br", children: [] },
          "Multiple",
          { tag: "br", children: [] },
          "lines!",
        ],
      },
      {
        input: "<p>Can we deal with empty tags?</p><p></p><p>Yes we can!</p>",
        expected: [
          { tag: "p", children: ["Can we deal with empty tags?"] },
          { tag: "p", children: [] },
          { tag: "p", children: ["Yes we can!"] },
        ],
      },
      {
        input: '<p>Can we handle a link to <Link to="/another-page">another page</Link></p>',
        expected: [
          {
            tag: "p",
            children: [
              "Can we handle a link to ",
              {
                tag: "Link",
                attributes: {
                  to: "/another-page",
                },
                children: ["another page"],
              },
            ],
          },
        ],
      },
      {
        input: '<p class="test">Only allow attributes for Links</p>',
        expected: [
          {
            tag: "p",
            children: ["Only allow attributes for Links"],
          },
        ],
      },
    ];

    for (const { input, expected } of testCases) {
      const result = parse(input);

      expect(result).toStrictEqual(expected);
    }
  });
});
