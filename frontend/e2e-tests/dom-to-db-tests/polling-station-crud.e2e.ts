import { expect } from "@playwright/test";
import { PollingStationFormPgObj } from "e2e-tests/page-objects/polling_station/PollingStationFormPgObj";
import { PollingStationListEmptyElectionPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListEmptyElectionPgObj";

import { test } from "./fixtures";

test.describe("Polling station CRUD", () => {
  test("it redirects correctly after succesful create", async ({ page, emptyElection }) => {
    await page.goto(`/elections/${emptyElection.id}/polling-stations#coordinator`);

    const pollingStationListPage = new PollingStationListEmptyElectionPgObj(page);
    await pollingStationListPage.createPollingStation.click();

    const form = new PollingStationFormPgObj(page);

    await form.fillIn({
      number: 42,
      name: "test42",
    });

    await form.create.click();

    expect(await pollingStationListPage.alert.textContent()).toContain("Stembureau 42 (test42) toegevoegd");
  });
});
