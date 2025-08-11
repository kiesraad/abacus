import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { LinkButton } from "./LinkButton";

describe("UI Component: link button", () => {
  test("should render a link button", () => {
    render(<LinkButton id="test" text="A link button" />);
    expect(screen.getByText("A link button")).toBeInTheDocument();
  });
});
