import { ReactElement } from "react";

import { render, RenderOptions } from "@testing-library/react";

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
