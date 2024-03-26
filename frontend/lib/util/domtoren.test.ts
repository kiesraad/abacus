import { expect, test } from "vitest";
import { domtoren } from "./domtoren";

const div = document.createElement("div");
div.innerHTML = `
  <p>
    <a href="#">test</a>
  </p>
`;

test("domtoren closest", async () => {
  const aEl = div.querySelector("a");
  const pEl = domtoren(aEl!).closest("p").el();

  expect(pEl!.tagName.toLowerCase()).toBe("p");
});

test("domtoren toggleClass", async () => {
  domtoren(div).toggleClass("testclass");
  expect(div.classList.contains("testclass")).toBe(true);
});
