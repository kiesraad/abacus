import { describe, expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { ProgressBar } from "@kiesraad/ui";

describe("UI Component: ProgressBar", () => {
  test("renders a progress bar with a title and percentage", () => {
    const { getByText } = render(
      <ProgressBar
        id="test"
        percentagesAndColorClasses={[{ percentage: 50, class: "default" }]}
        title="Progress"
        showPercentage
      />,
    );
    expect(getByText("Progress")).toBeInTheDocument();
    expect(getByText("50%")).toBeInTheDocument();
  });

  test("renders a progress bar without a title and percentage", () => {
    const { queryByRole } = render(
      <ProgressBar id="test" percentagesAndColorClasses={[{ percentage: 50, class: "default" }]} />,
    );

    expect(queryByRole("label")).not.toBeInTheDocument();
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
  });
});
