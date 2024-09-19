import { assert, describe, expect, test } from "vitest";

import { domtoren } from "./domtoren";

const div = document.createElement("div");
div.innerHTML = `
  <p>
    <a href="#">test</a>
  </p>
`;

describe("domtoren", () => {
  test("closest", () => {
    const aEl = div.querySelector("a");
    assert(aEl !== null, "aEl is null");

    const pEl = domtoren(aEl).closest("p").el();
    expect(pEl.tagName.toLowerCase()).toBe("p");
  });

  test("toggleClass", () => {
    domtoren(div).toggleClass("testclass");
    expect(div.classList.contains("testclass")).toBe(true);
  });

  test("removeClass", () => {
    domtoren(div).removeClass("testclass");
    expect(div.classList.contains("testclass")).toBe(false);
  });
  test("addclass", () => {
    domtoren(div).addClass("testaddclass");
    expect(div.classList.contains("testaddclass")).toBe(true);
  });
});
