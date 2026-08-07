import { type APIRequestContext, expect } from "@playwright/test";
import { dataEntryRequest } from "e2e-tests/test-data/request-response-templates";
import type { TestUser } from "e2e-tests/test-data/users";
import type {
  DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY,
  DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH,
  DataEntryId,
  ResolveDifferencesAction,
} from "@/types/generated/openapi";
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

export async function completeDataEntries(
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

export async function resolveDifferences(
  coordinator: { request: APIRequestContext },
  dataEntryId: DataEntryId,
  action: ResolveDifferencesAction,
): Promise<number> {
  const url: DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH = `/api/data_entries/${dataEntryId}/resolve_differences`;
  const data: DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY = action;
  const response = await coordinator.request.post(url, { data, headers: { "content-type": "application/json" } });
  expect(response.ok(), `Unexpected response: ${response.statusText()}`).toBeTruthy();
  return response.status();
}
