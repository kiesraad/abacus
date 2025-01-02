import { ReactElement } from "react";
import { createMemoryRouter, RouteObject } from "react-router-dom";

import { render, RenderOptions, screen } from "@testing-library/react";
import { UserEvent } from "@testing-library/user-event";
import { expect } from "vitest";

import { Providers } from "./Providers";

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: Providers, ...options });

/* eslint-disable import/export */
// Re-export everything in RTL but shadow the original `render` with our custom implementation.
export * from "@testing-library/react";
export { customRender as render };
export { router } from "./router";
/* eslint-enable import/export */

export const setupTestRouter = (routes: RouteObject[]) => {
  return createMemoryRouter(routes, {
    future: {
      v7_normalizeFormMethod: true,
    },
  });
};

export const expectErrorPage = async () => {
  expect(await screen.findByText(/Abacus is stuk/)).toBeVisible();
};

export const expectNotFound = async (message?: string) => {
  expect(await screen.findByText(new RegExp(message || "Pagina niet gevonden"))).toBeVisible();
};

export function getUrlMethodAndBody(call: [input: string | URL | Request, init?: RequestInit | undefined][]) {
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
    const input = await screen.findByTestId(key);
    await user.clear(input);
    await user.type(input, value.toString());
    expect(input).toHaveValue(value.toString());
  }
}
