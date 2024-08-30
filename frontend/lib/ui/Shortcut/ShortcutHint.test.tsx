import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ShortcutHint } from "./ShortcutHint";

describe("Shortcut", () => {
  test("should render", () => {
    render(<ShortcutHint id="test" shortcut="shift+enter" />);
    expect(screen.getByTestId("test")).toBeInTheDocument();

    expect(screen.getByText("shift")).toBeInTheDocument();
    expect(screen.getByText("enter")).toBeInTheDocument();
  });
});
