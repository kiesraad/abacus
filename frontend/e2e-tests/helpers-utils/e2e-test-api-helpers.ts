import type { APIRequestContext } from "@playwright/test";

import { dataEntryRequest } from "../test-data/request-response-templates";
import { DataEntryApiClient } from "./api-clients";

export function getTestPassword(username: string, prefix = ""): string {
  const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
  return `${prefix}${capitalizedUsername}Password01`;
}

export async function loginAs(request: APIRequestContext, username: string, passwordPrefix = "") {
  const password = getTestPassword(username, passwordPrefix);
  return await request.post("/api/login", {
    data: {
      username,
      password,
    },
  });
}

export async function completePollingStationDataEntries(
  pollingStationId: number,
  typistOneRequest: APIRequestContext,
  typistTwoRequest: APIRequestContext,
  firstRequest = dataEntryRequest,
  secondRequest = dataEntryRequest,
) {
  const firstDataEntry = new DataEntryApiClient(typistOneRequest, pollingStationId, 1);
  await firstDataEntry.claim();
  await firstDataEntry.save(firstRequest);
  await firstDataEntry.finalise();

  const secondDataEntry = new DataEntryApiClient(typistTwoRequest, pollingStationId, 2);
  await secondDataEntry.claim();
  await secondDataEntry.save(secondRequest);
  await secondDataEntry.finalise();
}
