import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ProgressBar } from "./ProgressBar";

describe("UI Component: ProgressBar", () => {
  test("renders a progress bar with a title and percentage", () => {
    const { getByText } = render(<ProgressBar percent={50} title="Progress" id="test" />);
    expect(getByText("Progress")).toBeInTheDocument();
    expect(getByText("50%")).toBeInTheDocument();
  });

  test("renders a progress bar without a title", () => {
    const { queryByRole } = render(<ProgressBar percent={50} id="test" />);

    expect(queryByRole("label")).not.toBeInTheDocument();
  });
});
