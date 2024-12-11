import { FormEventHandler, ReactNode, useRef } from "react";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render, screen } from "app/test/unit";

import { useKeyboard } from "@kiesraad/ui";

import { Form } from "./Form";

export const FormWithUseKeyboard = ({ onSubmit, children }: { onSubmit: FormEventHandler; children: ReactNode }) => {
  const ref = useRef(null);
  useKeyboard(ref);

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
      <FormWithUseKeyboard onSubmit={onSubmit}>
        <input id="test-input" />
      </FormWithUseKeyboard>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByTestId("test-input"), "hello world");

    await user.type(screen.getByTestId("test-form"), "{enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("Shift+Enter does submit the form", async () => {
    const onSubmit = vi.fn();

    render(
      <FormWithUseKeyboard onSubmit={onSubmit}>
        <input id="test-input" defaultValue="fizz" />
      </FormWithUseKeyboard>,
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
      <FormWithUseKeyboard onSubmit={onSubmit}>
        <input id="test-input" defaultValue="fizz" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </FormWithUseKeyboard>,
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
    const onSubmit = vi.fn((e: React.FormEvent) => {
      e.preventDefault();
    });

    render(
      <FormWithUseKeyboard onSubmit={onSubmit}>
        <input id="inp1" defaultValue="fizz1" />
        <input id="inp2" defaultValue="fizz2" />
        <input id="inp3" defaultValue="fizz3" />
        <button id="test-submit-button" type="submit">
          Submit
        </button>
      </FormWithUseKeyboard>,
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
