import { renderToString } from "react-dom/server";

import { updateTranslation } from ".";
import { describe, expect, test } from "vitest";

import { t, tx } from "./i18n";

describe("i18n", () => {
  test("Use translation functions", () => {
    // simple translation
    expect(t("election")).toEqual("Verkiezing");

    // variable interpolation
    updateTranslation("test", "Hello {item}!");
    expect(t("test", { item: "World" })).toEqual("Hello World!");

    // multiple variable interpolation
    updateTranslation("test", "Hello {item}! {pov} are my {thing}.");
    expect(t("test", { item: "World", pov: "You", thing: "sunshine" })).toEqual("Hello World! You are my sunshine.");

    // element interpolation
    {
      updateTranslation("test", "Visit my homepage <link>here</link>");
      const expected = 'Visit my homepage <a href="https://www.kiesraad.nl/">here</a>';
      const translated = tx("test", { link: (title) => <a href="https://www.kiesraad.nl/">{title}</a> });
      expect(renderToString(translated)).toEqual(expected);
    }

    // basic html support
    {
      updateTranslation("test", "That's a <strong>bold</strong> statement!");
      const expected = "That&#x27;s a <strong>bold</strong> statement!";
      const translated = tx("test");
      expect(renderToString(translated)).toEqual(expected);
    }

    // only allowed tags
    {
      updateTranslation("test", "That's a <article>bold</article> statement!");
      const expected = "That&#x27;s a &lt;article&gt;bold&lt;/article&gt; statement!";
      const translated = tx("test");
      expect(renderToString(translated)).toEqual(expected);
    }

    // combine!
    {
      updateTranslation("test", "That's a <italic>{what}</italic> statement!");
      const expected = "That&#x27;s a <em>nice</em> statement!";
      const translated = tx("test", { italic: (content) => <em>{content}</em> }, { what: "nice" });
      expect(renderToString(translated)).toEqual(expected);
    }
  });
});
