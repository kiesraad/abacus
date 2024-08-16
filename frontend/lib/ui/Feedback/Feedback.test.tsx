import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import { SingleError } from "./Feedback.stories";

describe("UI component: Feedback", () => {
  test("Feedback has expected children", () => {
    const { getByText } = render(<SingleError />);

    expect(getByText("Controleer uitgebrachte stemmen")).toBeInTheDocument();
    expect(
      getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder."),
    ).toBeInTheDocument();
  });
});
