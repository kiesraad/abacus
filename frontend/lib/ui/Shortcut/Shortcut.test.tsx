import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Shortcut } from "./Shortcut";

describe("Shortcut", () => {
  test("should render", () => {
    render(<Shortcut />);
    expect(true).toBe(true);
  });
});
