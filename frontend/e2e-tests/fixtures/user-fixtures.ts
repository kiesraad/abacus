import { type APIRequestContext, test as base, expect, type Page } from "@playwright/test";
import { createRandomUsername } from "e2e-tests/helpers-utils/e2e-test-utils";
import type { USER_CREATE_REQUEST_BODY, USER_CREATE_REQUEST_PATH, User } from "@/types/generated/openapi";

export type UserFixtures = {
  // page and request fixture for admin
  adminOne: { page: Page; request: APIRequestContext };
  // page and request fixture for GSB coordinator
  coordinatorOneGSB: { page: Page; request: APIRequestContext };
  // page and request fixture for GSB typist one
  typistOneGSB: { page: Page; request: APIRequestContext };
  // page and request fixture for GSB typist two
  typistTwoGSB: { page: Page; request: APIRequestContext };
  // page and request fixture for CSB coordinator
  coordinatorOneCSB: { page: Page; request: APIRequestContext };
  // page and request fixture for CSB typist one
  typistOneCSB: { page: Page; request: APIRequestContext };
  // page and request fixture for CSB typist two
  typistTwoCSB: { page: Page; request: APIRequestContext };
  // Newly created GSB User
  newTypistGSB: User;
};

export const FIXTURE_TYPIST_TEMP_PASSWORD: string = "temp_password_9876";

export const userFixtures = base.extend<UserFixtures>({
  adminOne: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/admin1.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  coordinatorOneGSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/coordinator1-GSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistOneGSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist1-GSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistTwoGSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist2-GSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  coordinatorOneCSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/coordinator1-CSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistOneCSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist1-CSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistTwoCSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist2-CSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  newTypistGSB: async ({ adminOne }, use) => {
    const { request } = adminOne;
    // create a new user
    const url: USER_CREATE_REQUEST_PATH = "/api/users";
    const data: USER_CREATE_REQUEST_BODY = {
      role: "typist_gsb",
      username: createRandomUsername(),
      fullname: "Gebruiker met Achternaam",
      temp_password: FIXTURE_TYPIST_TEMP_PASSWORD,
    };
    const userResponse = await request.post(url, { data });
    expect(userResponse.ok()).toBeTruthy();

    await use((await userResponse.json()) as User);
  },
});
