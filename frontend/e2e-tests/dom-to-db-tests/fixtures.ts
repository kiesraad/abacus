import { test as base, expect } from "@playwright/test";

import { PollingStation } from "@kiesraad/api";

type AutoFixtures = {
  // AutoFixtures contain { auto: true } and are called for each test automatically.
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  resetDatabase: void;
};

type Fixtures = {
  // Regular fixtures need to be passed into the test's arguments.
  pollingStation1: PollingStation;
};

export const test = base.extend<AutoFixtures & Fixtures>({
  resetDatabase: [
    async ({ request }, use) => {
      const response = await request.post(`/reset`);
      expect(response.ok()).toBeTruthy();
      await use();
    },
    { auto: true },
  ],
  pollingStation1: async ({ request }, use) => {
    const response = await request.get(`/api/polling_stations/1`);
    expect(response.ok()).toBeTruthy();
    const pollingStation = (await response.json()) as PollingStation;
    await use(pollingStation);
  },
});
