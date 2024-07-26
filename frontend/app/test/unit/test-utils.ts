import { ReactElement } from "react";

import { render, RenderOptions, screen } from "@testing-library/react";
import { UserEvent } from "@testing-library/user-event";
import { expect } from "vitest";

import { Providers } from "./Providers";

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: Providers, ...options });

export * from "@testing-library/react";
export { customRender as render };

export function getUrlMethodAndBody(
  call: [input: string | URL | Request, init?: RequestInit | undefined][],
) {
  let url;
  let method;
  let body;

  if (call.length > 0) {
    if (call[0] && call[0].length > 1) {
      if (call[0][0]) {
        url = call[0][0];
      }

      if (call[0][1]) {
        if (call[0][1].method) {
          method = call[0][1].method;
        }
        if (call[0][1].body) {
          body = JSON.parse(call[0][1].body as string) as object;
        }
      }
    }
  }
  return { url, method, body };
}

export async function userTypeInputs(user: UserEvent, inputs: { [key: string]: string | number }) {
  for (const [key, value] of Object.entries(inputs)) {
    const input = screen.getByTestId(key);
    await user.type(input, value.toString());
    expect(input).toHaveValue(value.toString());
  }
}
