import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

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

  test("Move focus", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => {
      e.preventDefault();
    });

    render(
      <Form onSubmit={onSubmit} id="test-form">
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <input id="inp3" defaultValue="fizz3" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </Form>,
    );

    const firstInput = screen.getByTestId("inp1");
    const secondInput = screen.getByTestId("inp2");
    const thirdInput = screen.getByTestId("inp3");
    const submitButton = screen.getByTestId("test-submit-button");

    firstInput.focus();
    expect(firstInput).toHaveFocus();

    await userEvent.keyboard("{arrowdown}");

    expect(secondInput).toHaveFocus();

    await userEvent.keyboard("{arrowup}");

    expect(firstInput).toHaveFocus();

    await userEvent.keyboard("{tab}");

    expect(secondInput).toHaveFocus();

    await userEvent.keyboard("{enter}");

    expect(thirdInput).toHaveFocus();

    await userEvent.keyboard("{enter}");

    expect(submitButton).toHaveFocus();

    await userEvent.keyboard("{Shift>}{arrowup}{/Shift}");
    expect(firstInput).toHaveFocus();

    await userEvent.keyboard("{Shift>}{arrowdown}{/Shift}");
    expect(thirdInput).toHaveFocus();
  });
});
