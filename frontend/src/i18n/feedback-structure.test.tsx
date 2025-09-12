import { describe, expect, test } from "vitest";

import feedback from "./locales/nl/feedback.json";

describe("feedback.json structure", () => {
  test("validate feedback entries", () => {
    const feedbackItems = Object.values(feedback).flatMap((item) => {
      if (typeof item !== "object") return [];
      return [item.typist, item.coordinator];
    });

    for (const entry of feedbackItems) {
      const keys = Object.keys(entry);

      // Title is mandatory
      expect(keys).toContain("title");

      // No other keys than below allowed
      for (const key of keys) {
        expect(["title", "content", "actions"]).toContain(key);
      }
    }
  });
});
