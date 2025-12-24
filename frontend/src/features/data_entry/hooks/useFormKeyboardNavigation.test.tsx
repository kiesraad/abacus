import { userEvent } from "@testing-library/user-event";
import { FormEvent, FormEventHandler, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";

import { Form } from "@/components/ui/Form/Form";
import { render, screen } from "@/testing/test-utils";

import { useFormKeyboardNavigation } from "./useFormKeyboardNavigation";

const FormWithNavigation = ({ onSubmit, children }: { onSubmit: FormEventHandler; children: ReactNode }) => {
  const ref = useFormKeyboardNavigation();

  return (
    <Form onSubmit={onSubmit} id="test-form" ref={ref}>
      {children}
    </Form>
  );
};

describe("useKeyboard", () => {
  test("Enter does not submit the form", async () => {
    const onSubmit = vi.fn();

    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="test-input" />
      </FormWithNavigation>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByTestId("test-input"), "hello world");

    await user.type(screen.getByTestId("test-form"), "{enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("Shift+Enter does submit the form", async () => {
    const onSubmit = vi.fn();

    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="test-input" defaultValue="fizz" />
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByTestId("test-input"), "hello world");

    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSubmit).toHaveBeenCalled();
  });

  test("Enter submits when submit button has focus", async () => {
    const onSubmit = vi.fn((e: FormEvent) => {
      e.preventDefault();
    });

    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="test-input" defaultValue="fizz" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByTestId("test-input"), "hello world");

    await user.keyboard("{enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    screen.getByTestId("test-submit-button").focus();
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalled();
  });

  test("Move focus", async () => {
    const onSubmit = vi.fn((e: FormEvent) => {
      e.preventDefault();
    });

    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <input id="inp3" defaultValue="fizz3" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    const firstInput = screen.getByTestId("inp1");
    const secondInput = screen.getByTestId("inp2");
    const thirdInput = screen.getByTestId("inp3");
    const submitButton = screen.getByTestId("test-submit-button");

    firstInput.focus();
    expect(firstInput).toHaveFocus();

    await user.keyboard("{arrowdown}");

    expect(secondInput).toHaveFocus();

    await user.keyboard("{arrowup}");

    expect(firstInput).toHaveFocus();

    await user.keyboard("{tab}");

    expect(secondInput).toHaveFocus();

    await user.keyboard("{enter}");

    expect(thirdInput).toHaveFocus();

    await user.keyboard("{enter}");

    expect(submitButton).toHaveFocus();
  });

  test("Move to first and last input", async () => {
    const onSubmit = vi.fn();

    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <input id="inp3" defaultValue="fizz3" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    const firstInput = screen.getByTestId("inp1");
    const thirdInput = screen.getByTestId("inp3");

    thirdInput.focus();
    expect(thirdInput).toHaveFocus();

    await user.keyboard("{Shift>}{arrowup}{/Shift}");
    expect(firstInput).toHaveFocus();

    await user.keyboard("{Shift>}{arrowdown}{/Shift}");
    expect(thirdInput).toHaveFocus();
  });

  test("Move to first and last input when there is no button", async () => {
    const onSubmit = vi.fn();

    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <input id="inp3" defaultValue="fizz3" />
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    const firstInput = screen.getByTestId("inp1");
    const thirdInput = screen.getByTestId("inp3");

    thirdInput.focus();
    expect(thirdInput).toHaveFocus();

    await user.keyboard("{Shift>}{arrowup}{/Shift}");
    expect(firstInput).toHaveFocus();

    await user.keyboard("{Shift>}{arrowdown}{/Shift}");
    expect(thirdInput).toHaveFocus();
  });

  test("Move to first input and checkbox", async () => {
    const onSubmit = vi.fn();

    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <input id="inp3" defaultValue="fizz3" />
        <div>
          <input type="checkbox" id="checkbox" />
          <div>
            <label htmlFor="checkbox">"buzzme"</label>
          </div>
        </div>
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    const firstInput = screen.getByTestId("inp1");
    const checkbox = screen.getByTestId("checkbox");

    checkbox.focus();
    expect(checkbox).toHaveFocus();

    await user.keyboard("{Shift>}{arrowup}{/Shift}");
    expect(firstInput).toHaveFocus();

    await user.keyboard("{Shift>}{arrowdown}{/Shift}");
    expect(checkbox).toHaveFocus();
  });

  test("Stay at the first input when moving up", async () => {
    const onSubmit = vi.fn();
    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <input id="inp3" defaultValue="fizz3" />
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    const firstInput = screen.getByTestId("inp1");
    const secondInput = screen.getByTestId("inp2");

    secondInput.focus();
    expect(secondInput).toHaveFocus();

    await user.keyboard("{arrowup}");
    expect(firstInput).toHaveFocus();

    await user.keyboard("{arrowup}");
    expect(firstInput).toHaveFocus();
  });

  test("Stay at the last input when moving down", async () => {
    const onSubmit = vi.fn();
    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    const firstInput = screen.getByTestId("inp1");
    const secondInput = screen.getByTestId("inp2");

    firstInput.focus();
    expect(firstInput).toHaveFocus();

    await user.keyboard("{arrowdown}");
    expect(secondInput).toHaveFocus();

    await user.keyboard("{arrowdown}");
    expect(secondInput).toHaveFocus();
  });

  test("Stay at the submit button when moving down", async () => {
    const onSubmit = vi.fn();
    render(
      <FormWithNavigation onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </FormWithNavigation>,
    );
    const user = userEvent.setup();

    const secondInput = screen.getByTestId("inp2");
    const submitButton = screen.getByTestId("test-submit-button");

    secondInput.focus();
    expect(secondInput).toHaveFocus();

    await user.keyboard("{arrowdown}");
    expect(submitButton).toHaveFocus();

    await user.keyboard("{arrowdown}");
    expect(submitButton).toHaveFocus();
  });
});
