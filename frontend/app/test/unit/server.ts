import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@kiesraad/api-mocks";

export const server = setupServer(
  ...handlers.map((h) => {
    // Node's Fetch implementation does not accept URLs with a protocol and host
    h.info.path = "http://testhost" + h.info.path.toString();
    return h;
  }),
);

// Override request handlers in order to test special cases
export function overrideOnce(
  method: keyof typeof http,
  path: string,
  status: number,
  body: string | Record<string, unknown>,
) {
  server.use(
    http[method](
      `http://testhost${path}`,
      () => {
        // https://mswjs.io/docs/api/response/once
        return typeof body === "string"
          ? new HttpResponse(body, { status })
          : HttpResponse.json(body, { status });
      },
      { once: true },
    ),
  );
}
