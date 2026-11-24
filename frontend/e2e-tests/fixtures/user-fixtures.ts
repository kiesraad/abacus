import { type APIRequestContext, test as base, type Page } from "@playwright/test";

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
});
