import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ProgressBar } from "./ProgressBar";

describe("UI Component: ProgressBar", () => {
  test("renders a progress bar with a title and percentage", () => {
    const { getByText } = render(<ProgressBar percent={50} title="Progress" />);
    expect(getByText("Progress")).toBeInTheDocument();
    expect(getByText("50%")).toBeInTheDocument();
  });
});
