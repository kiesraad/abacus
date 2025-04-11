import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { FileInput } from "./FileInput";

describe("UI Component: file input", () => {
  test("should render a file input", () => {
    render(<FileInput id="test">Bestand kiezen</FileInput>);
    expect(screen.getByLabelText("Bestand kiezen")).toBeInTheDocument();
  });
});
