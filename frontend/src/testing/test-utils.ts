import { ReactElement } from "react";
import { createMemoryRouter, RouteObject } from "react-router";

import { render, RenderOptions, screen } from "@testing-library/react";
import { UserEvent } from "@testing-library/user-event";
import { HttpHandler, matchRequestUrl } from "msw";
import { expect, vi } from "vitest";

import { Providers } from "./Providers";
import { getRouter } from "./router";
import { server } from "./server";

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: Providers, ...options });

/* eslint-disable import/export */
// Re-export everything in RTL but shadow the original `render` with our custom implementation.
export * from "@testing-library/react";
export { customRender as render };
/* eslint-enable import/export */

export const setupTestRouter = (routes: RouteObject[]) => {
  return createMemoryRouter(routes);
};

export function renderReturningRouter(ui: ReactElement) {
  const router = getRouter(ui);
  const providers = () => Providers({ router });
  render(ui, { wrapper: providers });
  return router;
}

export const expectErrorPage = async () => {
  expect(await screen.findByText(/Abacus is stuk/)).toBeVisible();
};

export const expectForbiddenErrorPage = async () => {
  expect(await screen.findByText(/Geen toegang/)).toBeVisible();
};

export const expectConflictErrorPage = async () => {
  expect(await screen.findByText(/Dit kan nu niet/)).toBeVisible();
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

export async function userTypeInputs(user: UserEvent, inputs: { [key: string]: string | number }, prefix: string = "") {
  for (const [key, value] of Object.entries(inputs)) {
    const input = await screen.findByTestId(prefix + key);
    await user.clear(input);
    await user.type(input, value.toString());
    expect(input).toHaveValue(value.toString());
  }
}

export function spyOnHandler(handler: HttpHandler) {
  const { method, path } = handler.info;

  const spy = vi.fn();
  spy.mockName(`${method} ${path} spy`);

  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (request.method === method && matchRequestUrl(url, path).matches) {
      void request
        .clone()
        .text()
        .then((body) => {
          if (url.searchParams.size > 0) {
            spy(body.length ? JSON.parse(body) : null, url.searchParams);
          } else {
            spy(body.length ? JSON.parse(body) : null);
          }
        });
    }
  });

  return spy;
}
