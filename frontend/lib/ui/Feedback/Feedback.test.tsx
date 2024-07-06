import { render } from "app/test/unit";
import { describe, expect, test } from "vitest";

import { DefaultFeedback } from "./Feedback.stories";

describe("UI component: Feedback", () => {
  test("Feedback has expected children", () => {
    const { getByText } = render(<DefaultFeedback type="error" title="Feedback title" />);

    expect(getByText("Feedback title")).toBeInTheDocument();
    expect(
      getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder."),
    ).toBeInTheDocument();
  });
});
