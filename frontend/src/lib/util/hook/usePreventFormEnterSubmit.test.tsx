import * as React from "react";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render } from "@kiesraad/test";
import { usePreventFormEnterSubmit } from "@kiesraad/util";

const TestComponent = ({ cb }: { cb: (event: React.FormEvent) => void }) => {
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);
  return (
    <div>
      <form ref={formRef} onSubmit={cb}>
        <input id="input-test" type="text" />
      </form>
    </div>
  );
};

describe("usePreventFormEnterSubmit", () => {
  test("prevents form submission on Enter", async () => {
    const fn = vi.fn((event: React.FormEvent) => {
      event.preventDefault();
    });
    const { getByTestId } = render(<TestComponent cb={fn} />);
    const user = userEvent.setup();

    const input = getByTestId("input-test");
    input.focus();
    await user.type(input, "hello{enter}");

    expect(fn).not.toHaveBeenCalled();
  });
});
