import { APIRequestContext } from "@playwright/test";
import { noRecountNoDifferencesRequest } from "e2e-tests/test-data/request-response-templates";

import { DataEntry } from "@/types/generated/openapi";

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
export async function completePollingStationDataEntries(request: APIRequestContext, pollingStationId: number) {
  for (const entryNumber of [1, 2]) {
    if (entryNumber === 1) {
      await loginAs(request, "typist1");
    } else if (entryNumber === 2) {
      await loginAs(request, "typist2");
    }

    const dataEntry = new DataEntryApiClient(request, pollingStationId, entryNumber);
    await dataEntry.claim();
    await dataEntry.save(noRecountNoDifferencesRequest);
    await dataEntry.finalise();
  }
}

export async function completePollingStationDataEntriesWithDifferences(
  request: APIRequestContext,
  pollingStationId: number,
) {
  await loginAs(request, "typist1");
  const firstDataEntry = new DataEntryApiClient(request, pollingStationId, 1);
  await firstDataEntry.claim();
  await firstDataEntry.save(noRecountNoDifferencesRequest);
  await firstDataEntry.finalise();

  await loginAs(request, "typist2");
  const secondDataEntry = new DataEntryApiClient(request, pollingStationId, 2);
  await secondDataEntry.claim();
  const cloneDataEntry = JSON.parse(JSON.stringify(noRecountNoDifferencesRequest)) as DataEntry;
  cloneDataEntry.data.political_group_votes[0]!.candidate_votes[0]!.votes -= 10;
  cloneDataEntry.data.political_group_votes[0]!.candidate_votes[1]!.votes += 10;
  await secondDataEntry.save(cloneDataEntry);
  await secondDataEntry.finalise();
}
