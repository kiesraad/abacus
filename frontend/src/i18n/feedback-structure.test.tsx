import { describe, expect, test } from "vitest";
import { type CommitteeCategory, committeeCategoryValues } from "@/types/generated/openapi";
import translations from "./locales/nl/nl.ts";

describe("feedback translations structure", () => {
  test.each(committeeCategoryValues)("validate feedback_%s.json", (cat: CommitteeCategory) => {
    const feedback = translations[`feedback_${cat}`];
    const feedbackItems = Object.values(feedback);

    for (const entry of feedbackItems) {
      if ("typist" in entry) {
        // No other keys than below allowed
        for (const key of Object.keys(entry.typist)) {
          expect(["title", "content", "actions"]).toContain(key);
        }
      }

      const keys = Object.keys(entry.coordinator);

      // Coordinator title is mandatory
      expect(keys).toContain("title");

      // No other keys than below allowed
      for (const key of keys) {
        expect(["title", "content", "actions"]).toContain(key);
      }
    }
  });
});
