import { describe, expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { ProgressBar } from "@kiesraad/ui";

describe("UI Component: ProgressBar", () => {
  test("renders a progress bar with a title and percentage", () => {
    const { getByText } = render(
      <ProgressBar id="test" data={{ percentage: 50, class: "default" }} title="Progress" showPercentage />,
    );
    expect(getByText("Progress")).toBeInTheDocument();
    expect(getByText("50%")).toBeInTheDocument();
  });

  test("renders a progress bar without a title and percentage", () => {
    const { queryByRole } = render(<ProgressBar id="test" data={{ percentage: 50, class: "default" }} />);

    expect(queryByRole("label")).not.toBeInTheDocument();
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
  });

  test("renders a progress bar with multiple bars", () => {
    const { queryByRole } = render(
      <ProgressBar
        id="test"
        data={[
          { percentage: 5, class: "errors-and-warnings" },
          { percentage: 3, class: "unfinished" },
          { percentage: 35, class: "in-progress" },
          { percentage: 30, class: "first-entry-finished" },
          { percentage: 25, class: "definitive" },
          { percentage: 2, class: "not-started" },
        ]}
      />,
    );

    expect(queryByRole("label")).not.toBeInTheDocument();
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
  });
});
