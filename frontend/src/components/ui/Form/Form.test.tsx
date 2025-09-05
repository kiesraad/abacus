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

    expect(screen.getByRole("group", { name: "Form title" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Form title" })).toBeVisible();
    expect(screen.getByTestId("test")).toBeVisible();
  });

  test("Form renders without title and with children", () => {
    render(
      <Form>
        <input id="test" />
      </Form>,
    );

    expect(screen.getByRole("group")).toBeVisible();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.getByTestId("test")).toBeVisible();
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
