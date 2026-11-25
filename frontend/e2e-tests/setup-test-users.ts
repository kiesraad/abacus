import { expect, request, test } from "@playwright/test";
import { testUsers, testUsersCSB } from "e2e-tests/test-data/users";
import { apiLoginAs, createUser, firstLogin } from "./helpers-utils/api-helpers/user-api-helpers";

test.describe("setup test users", () => {
  test("create test user accounts GSB", async () => {
    // create a new APIRequestContext
    const adminContext = await request.newContext();
    const loginResponse = await apiLoginAs(adminContext, "admin1");
    expect(loginResponse.status()).toBe(200);

    await adminContext.storageState({ path: "e2e-tests/state/admin1.json" });

    for (const user of testUsers) {
      await createUser(adminContext, user);

      const userContext = await request.newContext();
      await firstLogin(userContext, user);
      await userContext.storageState({ path: `e2e-tests/state/${user.username}.json` });
    }
  });

  test("create test user accounts CSB", async () => {
    // create a new APIRequestContext
    const adminContext = await request.newContext();
    const loginResponse = await apiLoginAs(adminContext, "admin1");
    expect(loginResponse.status()).toBe(200);

    await adminContext.storageState({ path: "e2e-tests/state/admin1.json" });

    for (const user of testUsersCSB) {
      await createUser(adminContext, user);

      const userContext = await request.newContext();
      await firstLogin(userContext, user);
      await userContext.storageState({ path: `e2e-tests/state/${user.username}.json` });
    }
  });
});
