import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { Form } from "./Form";

describe("UI Component: Form", () => {
  test("Form renders with title and children", () => {
    render(
      <Form title="Form title">
        <input id="test" />
      </Form>,
    );

    expect(screen.getByText("Form title")).toBeInTheDocument();
    expect(screen.getByTestId("test")).toBeInTheDocument();
  });

  test("Ref is forwarded", () => {
    const ref = { current: null };

    render(
      <Form ref={ref}>
        <input id="test" />
      </Form>,
    );

    expect(ref.current).toBeInstanceOf(HTMLFormElement);
  });
});
