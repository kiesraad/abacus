import { expect } from "@playwright/test";
import { test } from "e2e-tests/fixtures";
import { getTestPassword } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import {
  createInvestigation,
  fillCandidatesListPages,
  fillDataEntryPagesAndSave,
  uploadCandidatesAndInputHash,
  uploadElectionAndInputHash,
  uploadPollingStations,
} from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
import { LoginPgObj } from "e2e-tests/page-objects/authentication/LoginPgObj";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import { ExtraInvestigationPage } from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { ProgressList } from "e2e-tests/page-objects/data_entry/ProgressListPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { CheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { CountingMethodTypePgObj } from "e2e-tests/page-objects/election/create/CountingMethodTypePgObj";
import { NumberOfVotersPgObj } from "e2e-tests/page-objects/election/create/NumberOfVotersPgObj";
import { PollingStationRolePgObj } from "e2e-tests/page-objects/election/create/PollingStationRolePgObj";
import { ElectionDetailsPgObj } from "e2e-tests/page-objects/election/ElectionDetailsPgObj";
import { ElectionHome } from "e2e-tests/page-objects/election/ElectionHomePgObj";
import { ElectionReport } from "e2e-tests/page-objects/election/ElectionReportPgObj";
import { ElectionsOverviewPgObj } from "e2e-tests/page-objects/election/ElectionsOverviewPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { FinishDataEntry } from "e2e-tests/page-objects/election/FinishDataEntryPgObj";
import { AddInvestigationPgObj } from "e2e-tests/page-objects/investigations/AddInvestigationPgObj";
import { InvestigationFindingsPgObj } from "e2e-tests/page-objects/investigations/InvestigationFindingsPgObj";
import { InvestigationOverviewPgObj } from "e2e-tests/page-objects/investigations/InvestigationOverviewPgObj";
import { CoordinatorNavBarPgObj } from "e2e-tests/page-objects/nav_bar/CoordinatorNavBarPgObj";
import { PollingStationFormPgObj } from "e2e-tests/page-objects/polling_station/PollingStationFormPgObj";
import { PollingStationListPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListPgObj";
import { eml110b_single } from "e2e-tests/test-data/eml-files";
import { noRecountNoDifferencesDataEntry } from "e2e-tests/test-data/request-response-templates";
import { stat } from "node:fs/promises";

const investigations = [
  { number: "1", name: "Stadhuis", reason: "Reden", findings: "Probleem", correctedResults: true },
  {
    number: "2",
    name: "Basisschool de Regenboog",
    reason: "Reden",
    findings: "Geen probleem",
    correctedResults: false,
  },
  {
    number: "5",
    name: "Sportfondsenbad",
    reason: "Stembureau vergeten te importeren",
    findings: "Stembureau toegevoegd en ingevoerd",
    correctedResults: true,
  },
];

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

    const pollingStationRolePage = new PollingStationRolePgObj(page);
    await expect(pollingStationRolePage.header).toBeVisible();
    await pollingStationRolePage.next.click();

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
    const sessionCard = electionHomePage.getCommitteeSessionCard(1);
    await expect(sessionCard).toContainText("Eerste zitting — Klaar voor steminvoer");

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
    await expect(page.getByText("woensdag 18 maart 2026 om 21:34")).toBeVisible();
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
    await electionReportPage.downloadFirstSessionZip.click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("election_result_GR2022_Test.zip");
    expect((await stat(await download.path())).size).toBeGreaterThan(1024);
  });

  test("create new committee session", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login("coordinator1", getTestPassword("coordinator1"));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionDetailsPage = new ElectionDetailsPgObj(page);
    await electionDetailsPage.newSessionButton.click();
    await electionDetailsPage.newSessionModalConfirmButton.click();
  });

  test("add missing polling station", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login("coordinator1", getTestPassword("coordinator1"));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionDetailsPage = new ElectionDetailsPgObj(page);
    await expect(electionDetailsPage.header).toContainText("Gemeenteraad Test 2022");
    await electionDetailsPage.investigationsOverviewButton.click();

    const investigationsOverviewPage = new InvestigationOverviewPgObj(page);
    await investigationsOverviewPage.addInvestigationButton.click();

    const addInvestigationPage = new AddInvestigationPgObj(page);
    await expect(addInvestigationPage.header).toBeVisible();
    await addInvestigationPage.addPollingStation.click();

    const form = new PollingStationFormPgObj(page);

    await form.fillIn({
      number: 5,
      name: "Sportfondsenbad",
    });

    await form.create.click();

    const pollingStationListPage = new PollingStationListPgObj(page);
    expect(await pollingStationListPage.alert.textContent()).toContain("Stembureau 5 (Sportfondsenbad) toegevoegd");
  });

  for (const station of investigations) {
    test(`create investigation for ${station.name}`, async ({ page }) => {
      await page.goto("/account/login");

      const loginPage = new LoginPgObj(page);
      await loginPage.login("coordinator1", getTestPassword("coordinator1"));

      const overviewPage = new ElectionsOverviewPgObj(page);
      await expect(overviewPage.header).toBeVisible();
      await overviewPage.findElectionRowById(electionId!).click();

      await createInvestigation(page, station.name, station.reason);
    });
  }

  test("start data entry of corrected results", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login("coordinator1", getTestPassword("coordinator1"));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionDetailsPage = new ElectionDetailsPgObj(page);
    await electionDetailsPage.startDataEntryButton.click();
  });

  for (const station of investigations) {
    test(`finish investigation for ${station.name}`, async ({ page }) => {
      await page.goto("/account/login");

      const loginPage = new LoginPgObj(page);
      await loginPage.login("coordinator1", getTestPassword("coordinator1"));

      const overviewPage = new ElectionsOverviewPgObj(page);
      await expect(overviewPage.header).toBeVisible();
      await overviewPage.findElectionRowById(electionId!).click();

      const electionDetailsPage = new ElectionDetailsPgObj(page);
      await expect(electionDetailsPage.header).toContainText("Gemeenteraad Test 2022");
      await electionDetailsPage.investigationsOverviewButton.click();

      const investigationsOverviewPage = new InvestigationOverviewPgObj(page);
      await expect(investigationsOverviewPage.header).toContainText("Onderzoeken in tweede zitting");
      await investigationsOverviewPage.findInvestigationEditButtonByPollingStation(station.number).click();

      const investigationsFindingsPage = new InvestigationFindingsPgObj(page);
      await expect(investigationsFindingsPage.header).toBeVisible();
      await investigationsFindingsPage.findingsField.fill(station.findings);
      await investigationsFindingsPage.setCorrectedResults(station.correctedResults);
      await investigationsFindingsPage.save.click();

      const navBar = new CoordinatorNavBarPgObj(page);
      await navBar.menuButton.click();
      await navBar.electionsButton.click();

      await expect(overviewPage.header).toBeVisible();
    });
  }

  for (const typist of ["typist1", "typist2"]) {
    test(`corrected data entry with ${typist}`, async ({ page }) => {
      await page.goto("/account/login");

      const loginPage = new LoginPgObj(page);
      await loginPage.login(typist, getTestPassword(typist));

      const overviewPage = new ElectionsOverviewPgObj(page);
      await expect(overviewPage.header).toBeVisible();
      await overviewPage.findElectionRowById(electionId!).click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
      await dataEntryHomePage.pollingStationNumber.fill("1");
      await expect(dataEntryHomePage.pollingStationFeedback).toContainText("Stadhuis");
      await dataEntryHomePage.clickStart();

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.next.click();

      const differencesPage = new DifferencesPage(page);
      await differencesPage.admittedVotersEqualsVotesCastCheckbox.check();
      await differencesPage.differenceCompletelyAccountedForNo.check();
      await differencesPage.next.click();

      const progressList = new ProgressList(page);
      const [firstListName, secondListName, thirdListName] = await progressList.allListNames();

      const firstCandidatesPage = new CandidatesListPage(page, 1, firstListName!);
      await firstCandidatesPage.fillCandidate(0, 1336);
      await firstCandidatesPage.fillCandidate(1, 424);
      await firstCandidatesPage.next.click();

      const secondCandidatesPage = new CandidatesListPage(page, 2, secondListName!);
      await secondCandidatesPage.next.click();

      const thirdCandidatesPage = new CandidatesListPage(page, 3, thirdListName!);
      await thirdCandidatesPage.next.click();

      const checkAndSavePage = new CheckAndSavePage(page);
      await checkAndSavePage.save.click();
    });
  }

  for (const typist of ["typist1", "typist2"]) {
    test(`data entry for new pollings station with ${typist}`, async ({ page }) => {
      await page.goto("/account/login");

      const loginPage = new LoginPgObj(page);
      await loginPage.login(typist, getTestPassword(typist));

      const overviewPage = new ElectionsOverviewPgObj(page);
      await expect(overviewPage.header).toBeVisible();
      await overviewPage.findElectionRowById(electionId!).click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
      await dataEntryHomePage.pollingStationNumber.fill("5");
      await expect(dataEntryHomePage.pollingStationFeedback).toContainText("Sportfondsenbad");
      await dataEntryHomePage.clickStart();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.fillInPageAndClickNext(
        noRecountNoDifferencesDataEntry.voters_counts,
        noRecountNoDifferencesDataEntry.votes_counts,
      );

      const differencesPage = new DifferencesPage(page);
      await expect(differencesPage.fieldset).toBeVisible();
      await differencesPage.fillInPageAndClickNext(noRecountNoDifferencesDataEntry.differences_counts);

      await fillCandidatesListPages(page, noRecountNoDifferencesDataEntry);

      const checkAndSavePage = new CheckAndSavePage(page);
      await checkAndSavePage.save.click();

      await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
    });
  }

  test("check progress", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login("coordinator1", getTestPassword("coordinator1"));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionHome = new ElectionHome(page);
    await expect(electionHome.header).toBeVisible();
    await electionHome.statusButton.click();

    const statusPage = new ElectionStatus(page);
    await expect(statusPage.definitive).toBeVisible();

    const finishButton = statusPage.finish;
    await expect(finishButton).toBeVisible();
    await finishButton.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

    const electionDetails = new ElectionDetailsPgObj(page);
    await expect(electionDetails.header).toContainText("Gemeentelijk stembureau Test");
    await electionDetails.locationInput.fill("Pannerdam");
    await electionDetails.dateInput.fill("18-03-2026");
    await electionDetails.timeInput.fill("21:34");
    await electionDetails.continue.click();

    const electionHomePage = new ElectionReport(page);
    await expect(electionHomePage.header).toContainText("Tweede zitting Gemeentelijk Stembureau");
    const downloadPromise = page.waitForEvent("download");
    await electionHomePage.downloadSecondSessionZip.click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("election_result_GR2022_Test.zip");
    expect((await stat(await download.path())).size).toBeGreaterThan(1024);
  });
});
