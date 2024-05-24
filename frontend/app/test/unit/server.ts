import { http, HttpHandler, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@kiesraad/api-mocks";

export const server = setupServer(
  ...handlers.map((h) => {
    // Node's Fetch implementation does not accept URLs with a protocol and host
    h.info.path = "http://testhost" + h.info.path.toString();
    return h;
  }),
);

//keep a stack of the last 10 requests bodies
const _requestStack: { id: string; body: object }[] = [];

const addRequest = (id: string, body: object) => {
  _requestStack.push({ id, body });
  if (_requestStack.length > 10) {
    _requestStack.shift();
  }
};

export function getRequestBody(id: string): object | null {
  const requestItem = _requestStack.reverse().find((r) => r.id === id);
  if (!requestItem) {
    return null;
  }

  return requestItem.body;
}

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

export function interceptBodyForHandler(id: string, handler: HttpHandler) {
  const method = (handler.info.method as string).toLowerCase() as keyof typeof http;
  server.use(
    http[method](
      handler.info.path,
      async ({ request, requestId }) => {
        const clone = request.clone();
        const body = (await clone.json()) as object;
        addRequest(id, body);
        const result = await handler.run({ request, requestId });

        return result?.response;
      },
      { once: true },
    ),
  );
}
