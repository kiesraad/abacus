import { expect, test, assert } from "vitest";
import { domtoren } from "./domtoren";

const div = document.createElement("div");
div.innerHTML = `
  <p>
    <a href="#">test</a>
  </p>
`;

test("domtoren closest", () => {
  const aEl = div.querySelector("a");
  assert(aEl !== null, "aEl is null");

  const pEl = domtoren(aEl).closest("p").el();
  expect(pEl.tagName.toLowerCase()).toBe("p");
});

test("domtoren toggleClass", () => {
  domtoren(div).toggleClass("testclass");
  expect(div.classList.contains("testclass")).toBe(true);
});
