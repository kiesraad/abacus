import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";
import { FileInput } from "@kiesraad/ui";

describe("UI Component: file input", () => {
  test("should render a file input", () => {
    render(<FileInput id="test" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
