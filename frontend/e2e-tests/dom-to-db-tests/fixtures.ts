import { test as base, expect } from "@playwright/test";

type AutoFixtures = {
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  resetDatabase: void;
};

export const test = base.extend<AutoFixtures>({
  resetDatabase: [
    async ({ request }, use) => {
      const response = await request.post(`/reset`);
      expect(response.ok()).toBeTruthy();
      await use();
    },
    { auto: true },
  ],
});
