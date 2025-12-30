/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright Oxide Computer Company
 *
 * https://github.com/oxidecomputer/console/blob/8dcddcef62b8d10dfcd3adb470439212b23b3d5e/test/unit/server.ts
 */
import { delay, HttpResponse, http, type JsonBodyType } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer();

// Override request handlers in order to test special cases
export function overrideOnce(
  method: keyof typeof http,
  path: string,
  status: number,
  body: string | null | JsonBodyType,
  delayResponse?: "infinite" | number,
) {
  const handler = http[method](
    path,
    async () => {
      if (delayResponse) {
        await delay(delayResponse);
      }
      // https://mswjs.io/docs/api/response/once
      if (typeof body === "string" || body === null) {
        return new HttpResponse(body, { status });
      } else {
        return HttpResponse.json(body, { status });
      }
    },
    { once: true },
  );

  server.use(handler);

  return handler;
}
