import { expect, request, test } from "@playwright/test";
import { createUser, firstLogin, loginAs } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import { testUsers } from "e2e-tests/test-data/users";

test.describe("setup test users", () => {
  test("create test user accounts", async () => {
    // create a new APIRequestContext
    const adminContext = await request.newContext();
    const loginResponse = await loginAs(adminContext, "admin1");
    expect(loginResponse.status()).toBe(200);

    await adminContext.storageState({ path: "e2e-tests/state/admin1.json" });

    for (const user of testUsers) {
      await createUser(adminContext, user);

      const userContext = await request.newContext();
      await firstLogin(userContext, user);
      await userContext.storageState({ path: `e2e-tests/state/${user.username}.json` });
    }
  });
});
