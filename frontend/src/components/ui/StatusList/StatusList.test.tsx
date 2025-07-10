import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { StatusList } from "./StatusList";

describe("StatusList", () => {
  test("renders a list", () => {
    render(
      <StatusList>
        <StatusList.Item status="accept">Hello</StatusList.Item>
        <StatusList.Item status="warning">World</StatusList.Item>
      </StatusList>,
    );
    expect(document.querySelector("ul")).not.toBeNull();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
  });
});
