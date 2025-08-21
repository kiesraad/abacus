import { expect } from "@playwright/test";
import { test } from "e2e-tests/fixtures";
import { getTestPassword } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import {
  fillDataEntryPagesAndSave,
  uploadCandidatesAndInputHash,
  uploadElectionAndInputHash,
  uploadPollingStations,
} from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
import { LoginPgObj } from "e2e-tests/page-objects/authentication/LoginPgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { CheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { CountingMethodTypePgObj } from "e2e-tests/page-objects/election/create/CountingMethodTypePgObj";
import { NumberOfVotersPgObj } from "e2e-tests/page-objects/election/create/NumberOfVotersPgObj";
import { ElectionDetailsPgObj } from "e2e-tests/page-objects/election/ElectionDetailsPgObject";
import { ElectionHome } from "e2e-tests/page-objects/election/ElectionHomePgObj";
import { ElectionReport } from "e2e-tests/page-objects/election/ElectionReportPgObj";
import { ElectionsOverviewPgObj } from "e2e-tests/page-objects/election/ElectionsOverviewPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { FinishDataEntry } from "e2e-tests/page-objects/election/FinishDataEntryPgObj";
import { PollingStationFormPgObj } from "e2e-tests/page-objects/polling_station/PollingStationFormPgObj";
import { PollingStationListPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListPgObj";
import { eml110b_single } from "e2e-tests/test-data/eml-files";
import { noRecountNoDifferencesDataEntry } from "e2e-tests/test-data/request-response-templates";
import { stat } from "node:fs/promises";

test.describe.configure({ mode: "serial" });

test.describe("full flow", () => {
  let electionId: number | null = null;

  test("create election and a new polling station", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login("admin1", getTestPassword("admin1"));

    const electionsOverviewPage = new ElectionsOverviewPgObj(page);
    await electionsOverviewPage.create.click();

    await uploadElectionAndInputHash(page);
    await uploadCandidatesAndInputHash(page);
    await uploadPollingStations(page, eml110b_single);

    const countingMethodPage = new CountingMethodTypePgObj(page);
    await expect(countingMethodPage.header).toBeVisible();
    await countingMethodPage.next.click();

    const numberOfVotersPage = new NumberOfVotersPgObj(page);
    await expect(numberOfVotersPage.header).toBeVisible();
    await expect(numberOfVotersPage.input).toHaveValue("612694"); // value comes from eml110b
    await numberOfVotersPage.input.fill("61269");
    await numberOfVotersPage.next.click();

    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await expect(checkAndSavePage.numberOfVoters).toHaveText("61.269 kiesgerechtigden");
    const election = await checkAndSavePage.saveElection();

    electionId = election.id;

    await expect(electionsOverviewPage.adminHeader).toBeVisible();
    await electionsOverviewPage.findElectionRowById(electionId).click();

    const electionHomePage = new ElectionHome(page);
    await expect(electionHomePage.header).toContainText("Gemeenteraad Test 2022");

    await electionHomePage.pollingStationsRow.click();
    const pollingStationListPage = new PollingStationListPgObj(page);
    await expect(pollingStationListPage.header).toBeVisible();
    await pollingStationListPage.createPollingStation.click();

    const form = new PollingStationFormPgObj(page);

    await form.fillIn({ number: 2, name: "Basisschool de Regenboog" });
    await form.create.click();
    expect(await pollingStationListPage.alert.textContent()).toContain(
      "Stembureau 2 (Basisschool de Regenboog) toegevoegd",
    );
  });

  test("start data entry", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login("coordinator1", getTestPassword("coordinator1"));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionHomePage = new ElectionHome(page);
    await expect(electionHomePage.header).toContainText("Gemeenteraad Test 2022");
    await electionHomePage.detailsButton.click();

    const electionDetails = new ElectionDetailsPgObj(page);
    await expect(electionDetails.header).toContainText("Gemeentelijk stembureau Test");
    await electionDetails.fillForm("Pannerdam", "18-03-2026", "21:34");

    await expect(electionHomePage.header).toContainText("Gemeenteraad Test 2022");
    await expect(page.getByText("woensdag 18 maart 2026 21:34")).toBeVisible();
    await electionHomePage.startButton.click();

    const electionStatus = new ElectionStatus(page);
    await expect(electionStatus.header).toContainText("Eerste zitting");
  });

  for (const station of [
    { number: "1", name: "Stadhuis" },
    { number: "2", name: "Basisschool de Regenboog" },
  ]) {
    test(`first data entry ${station.name}`, async ({ page }) => {
      await page.goto("/account/login");

      const loginPage = new LoginPgObj(page);
      await loginPage.login("typist1", getTestPassword("typist1"));

      const overviewPage = new ElectionsOverviewPgObj(page);
      await expect(overviewPage.header).toBeVisible();
      await overviewPage.findElectionRowById(electionId!).click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
      await dataEntryHomePage.pollingStationNumber.fill(station.number);
      await expect(dataEntryHomePage.pollingStationFeedback).toContainText(station.name);
      await dataEntryHomePage.clickStart();

      await fillDataEntryPagesAndSave(page, noRecountNoDifferencesDataEntry);
    });

    test(`second data entry ${station.name}`, async ({ page }) => {
      await page.goto("/account/login");

      const loginPage = new LoginPgObj(page);
      await loginPage.login("typist2", getTestPassword("typist2"));

      const overviewPage = new ElectionsOverviewPgObj(page);
      await expect(overviewPage.header).toBeVisible();
      await overviewPage.findElectionRowById(electionId!).click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
      await dataEntryHomePage.pollingStationNumber.fill(station.number);
      await expect(dataEntryHomePage.pollingStationFeedback).toContainText(station.name);
      await dataEntryHomePage.clickStart();

      await fillDataEntryPagesAndSave(page, noRecountNoDifferencesDataEntry);
    });
  }

  test("finish data entry", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login("coordinator1", getTestPassword("coordinator1"));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionHomePage = new ElectionHome(page);
    await expect(electionHomePage.header).toContainText("Gemeenteraad Test 2022");
    await electionHomePage.statusButton.click();

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

    const electionReportPage = new ElectionReport(page);
    const downloadPromise = page.waitForEvent("download");
    await electionReportPage.downloadPdf.click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Model_Na31-2_GR2022_Test.pdf");

    // The resulting PDF should be around 50 KB
    expect((await stat(await download.path())).size).toBeGreaterThan(42_000);
  });
});
