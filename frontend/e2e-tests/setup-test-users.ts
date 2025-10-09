import { expect, request, test } from "@playwright/test";

import { getTestPassword, loginAs } from "./helpers-utils/e2e-test-api-helpers";
import { testUsers } from "./test-data/users";

test.describe("setup test users", () => {
  test("create test user accounts", async () => {
    // create a new APIRequestContext
    const adminContext = await request.newContext();
    const loginResponse = await loginAs(adminContext, "admin1");
    expect(loginResponse.status()).toBe(200);

    await adminContext.storageState({ path: "e2e-tests/state/admin1.json" });

    for (const user of testUsers) {
      const response = await adminContext.post("/api/user", {
        data: {
          ...user,
          temp_password: getTestPassword(user.username, "Temp"),
        },
      });
      expect(response.status()).toBe(201);
    }

    for (const user of testUsers) {
      const userContext = await request.newContext();
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
      await userContext.storageState({ path: `e2e-tests/state/${user.username}.json` });
    }
  });
});
