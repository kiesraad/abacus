import { type APIRequestContext, expect } from "@playwright/test";
import type { TestUser } from "e2e-tests/test-data/users";
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

export async function createUser(adminContext: APIRequestContext, user: TestUser) {
  const response = await adminContext.post("/api/users", {
    data: {
      ...user,
      temp_password: getTestPassword(user.username, "Temp"),
    },
  });
  expect(response.status()).toBe(201);
}

export async function firstLogin(userContext: APIRequestContext, user: TestUser) {
  const loginResponse = await loginAs(userContext, user.username, "Temp");
  expect(loginResponse.status()).toBe(200);

  const response = await userContext.put("/api/account", {
    data: {
      username: user.username,
      fullname: user.fullname,
      password: getTestPassword(user.username),
    },
  });
  expect(response.status()).toBe(200);
}
