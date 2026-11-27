import { setTimeout } from "node:timers/promises";
import { type APIRequestContext, expect } from "@playwright/test";
import type { TestUser } from "e2e-tests/test-data/users";

export function getTestPassword(username: string, prefix = ""): string {
  const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
  return `${prefix}${capitalizedUsername}Password01`;
}

export async function apiLoginAs(request: APIRequestContext, username: string, passwordPrefix = "") {
  const password = getTestPassword(username, passwordPrefix);
  // Parallel tests log in from the same IP; retry until another test's successful login releases the rate limit
  const deadline = Date.now() + 60000;
  for (;;) {
    const response = await request.post("/api/login", { data: { username, password } });
    if (response.status() !== 429 || Date.now() >= deadline) {
      return response;
    }
    await setTimeout(250);
  }
}

export async function apiLogout(request: APIRequestContext) {
  return await request.post("/api/logout");
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
