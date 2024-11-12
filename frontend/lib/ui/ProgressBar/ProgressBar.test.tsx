import { describe, expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { PercentageAndColorClass, ProgressBar } from "@kiesraad/ui";

describe("UI Component: ProgressBar", () => {
  test("renders a progress bar with a title and percentage", () => {
    const { getByLabelText, getByRole } = render(
      <ProgressBar id="test" data={{ percentage: 50, class: "default" }} title="Progress" showPercentage />,
    );

    expect(getByLabelText("Progress")).toBeInTheDocument();
    expect(getByRole("complementary")).toHaveTextContent("50%");

    const innerBars = getByRole("progressbar").children;
    expect(innerBars.length).toEqual(1);
    for (const bar of innerBars) {
      expect(bar.getAttribute("style")).toEqual("width: 50%;");
      expect(bar.classList.contains("default")).toBeTruthy();
    }
  });

  test("renders a progress bar without a title and percentage", () => {
    const { queryByRole, queryByTestId, queryByText } = render(
      <ProgressBar id="test" data={{ percentage: 50, class: "default" }} />,
    );

    expect(queryByTestId("progressbar-label")).not.toBeInTheDocument();
    expect(queryByRole("complementary")).not.toBeInTheDocument();
    expect(queryByText("50%")).not.toBeInTheDocument();
  });

  test("renders a progress bar with multiple bars", () => {
    const data: PercentageAndColorClass[] = [
      { percentage: 25, class: "definitive" },
      { percentage: 30, class: "first-entry-finished" },
      { percentage: 35, class: "in-progress" },
      { percentage: 3, class: "unfinished" },
      { percentage: 5, class: "errors-and-warnings" },
      { percentage: 2, class: "not-started" },
    ];
    const { queryByRole, queryByTestId } = render(<ProgressBar id="test" data={data} />);

    expect(queryByTestId("progressbar-label")).not.toBeInTheDocument();
    expect(queryByRole("complementary")).not.toBeInTheDocument();

    const bars = [...screen.getByTestId("multi-outer-bar").children];
    bars.forEach((bar, index) => {
      expect(bar.getAttribute("style")).toEqual(`width: ${data[index]?.percentage}%;`);
      expect(bar.classList.contains(`${data[index]?.class}`)).toBeTruthy();
    });
  });
});
