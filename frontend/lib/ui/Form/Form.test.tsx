import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Form } from "./Form";

describe("UI Component: Form", () => {
  test("Form renders with children", () => {
    render(
      <Form>
        <input id="test" />
      </Form>,
    );

    expect(screen.getByTestId("test")).toBeInTheDocument();
  });

  test("Enter does not submit the form", async () => {
    const onSubmit = vi.fn();

    render(
      <Form onSubmit={onSubmit} id="test-form">
        <input id="test-input" />
      </Form>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByTestId("test-input"), "hello world");

    await user.type(screen.getByTestId("test-form"), "{enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("Shift+Enter does submit the form", async () => {
    const onSubmit = vi.fn();

    render(
      <Form onSubmit={onSubmit} id="test-form">
        <input id="test-input" defaultValue="fizz" />
      </Form>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByTestId("test-input"), "hello world");

    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSubmit).toHaveBeenCalled();
  });

  test("Enter submits when submit button has focus", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => {
      e.preventDefault();
    });

    render(
      <Form onSubmit={onSubmit} id="test-form">
        <input id="test-input" defaultValue="fizz" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </Form>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByTestId("test-input"), "hello world");

    await user.keyboard("{enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    screen.getByTestId("test-submit-button").focus();
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalled();
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
