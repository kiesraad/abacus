/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright Oxide Computer Company
 */
import { http, HttpResponse, JsonBodyType } from "msw";
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
  body: string | null | JsonBodyType,
) {
  server.use(
    http[method](
      `http://testhost${path}`,
      () => {
        // https://mswjs.io/docs/api/response/once
        if (typeof body === "string" || body === null) {
          return new HttpResponse(body, { status });
        } else {
          return HttpResponse.json(body, { status });
        }
      },
      { once: true },
    ),
  );
}
