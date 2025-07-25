import { APIRequestContext } from "@playwright/test";

import { dataEntryRequest } from "../test-data/request-response-templates";
import { DataEntryApiClient } from "./api-clients";

export async function loginAs(request: APIRequestContext, username: string) {
  const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
  const password = capitalizedUsername + "Password01";
  await request.post("/api/user/login", {
    data: {
      username,
      password,
    },
  });
}

export async function completePollingStationDataEntries(
  request: APIRequestContext,
  pollingStationId: number,
  firstRequest = dataEntryRequest,
  secondRequest = dataEntryRequest,
) {
  await loginAs(request, "typist1");
  const firstDataEntry = new DataEntryApiClient(request, pollingStationId, 1);
  await firstDataEntry.claim();
  await firstDataEntry.save(firstRequest);
  await firstDataEntry.finalise();

  await loginAs(request, "typist2");
  const secondDataEntry = new DataEntryApiClient(request, pollingStationId, 2);
  await secondDataEntry.claim();
  await secondDataEntry.save(secondRequest);
  await secondDataEntry.finalise();
}
