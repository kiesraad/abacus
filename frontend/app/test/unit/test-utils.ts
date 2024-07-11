import { ReactElement } from "react";
import { Providers } from "./Providers";

import { render, RenderOptions } from "@testing-library/react";

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: Providers, ...options });

export * from "@testing-library/react";
export { customRender as render };

export function getBodyObject(
  call: [input: string | URL | Request, init?: RequestInit | undefined][],
) {
  if (call.length > 0) {
    if (call[0] && call[0].length > 1) {
      if (call[0][1]) {
        if (call[0][1].body) {
          const body = call[0][1].body;
          return JSON.parse(body as string) as object;
        }
      }
    }
  }
  return null;
}
