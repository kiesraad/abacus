import { type APIRequestContext, expect } from "@playwright/test";
import type { TestUser } from "e2e-tests/test-data/users";
import type { ElectionStatusResponse } from "@/types/generated/openapi";
import { dataEntryRequest } from "../test-data/request-response-templates";
import { DataEntryApiClient } from "./api-clients";

export function getTestPassword(username: string, prefix = ""): string {
  const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
  return `${prefix}${capitalizedUsername}Password01`;
}

export async function apiLoginAs(request: APIRequestContext, username: string, passwordPrefix = "") {
  const password = getTestPassword(username, passwordPrefix);
  return await request.post("/api/login", {
    data: {
      username,
      password,
    },
  });
}

export async function apiLogout(request: APIRequestContext) {
  return await request.post("/api/logout");
}

export async function resolveDataEntryId(
  request: APIRequestContext,
  electionId: number,
  pollingStationId: number,
): Promise<number> {
  const response = await request.get(`/api/elections/${electionId}/status`);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as ElectionStatusResponse;
  const entry = body.statuses.find((s) => s.source.type === "PollingStation" && s.source.id === pollingStationId);
  expect(entry, `Could not find data_entry_id for polling station ${pollingStationId}`).toBeDefined();
  return entry!.data_entry_id;
}

export async function completePollingStationDataEntries(
  dataEntryId: number,
  typistOneRequest: APIRequestContext,
  typistTwoRequest: APIRequestContext,
  firstRequest = dataEntryRequest,
  secondRequest = dataEntryRequest,
) {
  const firstDataEntry = new DataEntryApiClient(typistOneRequest, dataEntryId, 1);
  await firstDataEntry.claim();
  await firstDataEntry.save(firstRequest);
  await firstDataEntry.finalise();

  const secondDataEntry = new DataEntryApiClient(typistTwoRequest, dataEntryId, 2);
  await secondDataEntry.claim();
  await secondDataEntry.save(secondRequest);
  await secondDataEntry.finalise();
}

export async function createUser(adminContext: APIRequestContext, user: TestUser) {
  const response = await adminContext.post("/api/users", {
    data: {
      ...user,
      temp_password: getTestPassword(user.username, "Temp"),
    },
  });
  expect(response.status(), `response status not 201: ${await response.json()}`).toBe(201);
}

export async function firstLogin(userContext: APIRequestContext, user: TestUser) {
  const loginResponse = await apiLoginAs(userContext, user.username, "Temp");
  expect(loginResponse.status(), `response status not 200: ${await loginResponse.json()}`).toBe(200);

  const response = await userContext.put("/api/account", {
    data: {
      username: user.username,
      fullname: user.fullname,
      password: getTestPassword(user.username),
    },
  });
  expect(response.status(), `response status not 200: ${await response.json()}`).toBe(200);
}
