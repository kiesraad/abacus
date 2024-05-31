import { describe, expect, test } from "vitest";
import { render } from "app/test/unit";
import { DefaultSpinner } from "./Spinner.stories";

describe("UI component: Spinner", () => {
  test("Spinner renders", () => {
    const { getByRole } = render(<DefaultSpinner size="md" />);
    expect(getByRole("progressbar")).toBeInTheDocument();
  });
});
