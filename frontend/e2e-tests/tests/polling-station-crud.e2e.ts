import { expect } from "@playwright/test";
import { PollingStationFormPgObj } from "e2e-tests/page-objects/polling_station/PollingStationFormPgObj";

import { test } from "../fixtures";
import { PollingStationListEmptyPgObj } from "../page-objects/polling_station/PollingStationListEmptyPgObj";
import { PollingStationListPgObj } from "../page-objects/polling_station/PollingStationListPgObj";

test.use({
  storageState: "e2e-tests/state/coordinator1.json",
});

test.describe("Polling station CRUD", () => {
  test("it redirects correctly after successful create of first polling station of an election", async ({
    page,
    emptyElection,
  }) => {
    await page.goto(`/elections/${emptyElection.id}/polling-stations`);

    const pollingStationListEmptyPage = new PollingStationListEmptyPgObj(page);
    await pollingStationListEmptyPage.createPollingStation.click();

    const form = new PollingStationFormPgObj(page);

    await form.fillIn({
      number: 42,
      name: "test42",
    });

    await form.create.click();

    const pollingStationListPage = new PollingStationListPgObj(page);
    expect(await pollingStationListPage.alert.textContent()).toContain("Stembureau 42 (test42) toegevoegd");
  });

  test("it redirects correctly after successful create of another polling station", async ({ page, election }) => {
    await page.goto(`/elections/${election.election.id}/polling-stations`);

    const pollingStationListPage = new PollingStationListPgObj(page);
    await pollingStationListPage.createPollingStation.click();

    const form = new PollingStationFormPgObj(page);

    await form.fillIn({
      number: 43,
      name: "test43",
    });

    await form.create.click();

    expect(await pollingStationListPage.alert.textContent()).toContain("Stembureau 43 (test43) toegevoegd");
  });
});
