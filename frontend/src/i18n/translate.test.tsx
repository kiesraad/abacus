import { renderToString } from "react-dom/server";

import { describe, expect, test } from "vitest";

import { locale, translations } from "./i18n";
import { hasTranslation, t, translate, tx } from "./translate";

function updateTestTranslation(value: string) {
  translations[locale].test = value;
}

describe("i18n", () => {
  test("Use translation functions", () => {
    expect(hasTranslation("election.title.singular")).toEqual(true);
    expect(hasTranslation("foo.bar")).toEqual(false);

    expect(translate("election.title.singular")).toEqual("Verkiezing");

    // we need to disable the linter to test the method with an unknown translation key
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(translate("foo.bar")).toEqual("foo.bar");

    // simple translation
    expect(t("election.title.singular")).toEqual("Verkiezing");

    // variable interpolation
    updateTestTranslation("Hello {item}!");
    expect(t("test", { item: "World" })).toEqual("Hello World!");

    // multiple variable interpolation
    updateTestTranslation("Hello {item}! {pov} are my {thing}.");
    expect(t("test", { item: "World", pov: "You", thing: "sunshine" })).toEqual("Hello World! You are my sunshine.");

    // element interpolation
    {
      updateTestTranslation("Visit my homepage <link>here</link>");
      const expected = 'Visit my homepage <a href="https://www.kiesraad.nl/">here</a>';
      const translated = tx("test", { link: (title) => <a href="https://www.kiesraad.nl/">{title}</a> });
      expect(renderToString(translated)).toEqual(expected);
    }

    // basic html support
    {
      updateTestTranslation("That's a <strong>bold</strong> statement!");
      const expected = "That&#x27;s a <strong>bold</strong> statement!";
      const translated = tx("test");
      expect(renderToString(translated)).toEqual(expected);
    }

    // only allowed tags
    {
      updateTestTranslation("That's a <article>bold</article> statement!");
      const expected = "That&#x27;s a &lt;article&gt;bold&lt;/article&gt; statement!";
      const translated = tx("test");
      expect(renderToString(translated)).toEqual(expected);
    }

    // combine!
    {
      updateTestTranslation("That's a <italic>{what}</italic> statement!");
      const expected = "That&#x27;s a <em>nice</em> statement!";
      const translated = tx("test", { italic: (content) => <em>{content}</em> }, { what: "nice" });
      expect(renderToString(translated)).toEqual(expected);
    }
  });
});
