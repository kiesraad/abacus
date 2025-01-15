import { expect } from "@playwright/test";
import { PollingStationFormPgObj } from "e2e-tests/page-objects/polling_station/PollingStationFormPgObj";
import { PollingStationListPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListPgObj";

import { test } from "./fixtures";

test.describe("Polling station CRUD", () => {
  test("it redirects correctly after succesful create", async ({ page }) => {
    await page.goto("/elections/1/polling-stations#coordinator");

    const pollingStationListPage = new PollingStationListPgObj(page);
    await pollingStationListPage.createPollingStationButton.click();

    const form = new PollingStationFormPgObj(page);

    await form.fillIn({
      number: 42,
      name: "test42",
    });

    await form.submitCreate();

    expect(await pollingStationListPage.alert.textContent()).toContain("Stembureau 42 (test42) toegevoegd");
  });
});
