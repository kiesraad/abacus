import { stat } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import { CountingDifferencesPollingStationPage } from "e2e-tests/page-objects/data_entry/CountingDifferencesPollingStationPgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import { ExtraInvestigationPage } from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { ProgressList } from "e2e-tests/page-objects/data_entry/ProgressListPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { CheckCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckCandidateDefinitionPgObj";
import { CheckElectionDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckElectionDefinitionPgObj";
import { CheckPollingStationDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckPollingStationDefinitionPgObj";
import { UploadCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadCandidateDefinitionPgObj";
import { UploadElectionDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadElectionDefinitionPgObj";
import { UploadPollingStationDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadPollingStationDefinitionPgObj";
import { ElectionDetailsPgObj } from "e2e-tests/page-objects/election/ElectionDetailsPgObj";
import { AddInvestigationPgObj } from "e2e-tests/page-objects/investigations/AddInvestigationPgObj";
import { InvestigationOverviewPgObj } from "e2e-tests/page-objects/investigations/InvestigationOverviewPgObj";
import { InvestigationPrintCorrigendumPgObj } from "e2e-tests/page-objects/investigations/InvestigationPrintCorrigendumPgObj";
import { InvestigationReasonPgObj } from "e2e-tests/page-objects/investigations/InvestigationReasonPgObj";

import type { PollingStationResults } from "@/types/generated/openapi";

import { eml110a, eml110b, eml230b } from "../test-data/eml-files";

export async function fillDataEntryPages(page: Page, results: PollingStationResults) {
  if (results.model === "CSOFirstSession") {
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(results.extra_investigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(results.counting_differences_polling_station);
  }

  const votersAndVotesPage = new VotersAndVotesPage(page);
  await expect(votersAndVotesPage.fieldset).toBeVisible();
  await votersAndVotesPage.fillInPageAndClickNext(results.voters_counts, results.votes_counts);

  const differencesPage = new DifferencesPage(page);
  await expect(differencesPage.fieldset).toBeVisible();
  await differencesPage.fillInPageAndClickNext(results.differences_counts);

  await fillCandidatesListPages(page, results);

  const checkAndSavePage = new CheckAndSavePage(page);
  await expect(checkAndSavePage.fieldset).toBeVisible();
  return checkAndSavePage;
}

export async function fillCandidatesListPages(page: Page, results: PollingStationResults) {
  const candidateListNames: string[] = await new ProgressList(page).allListNames();

  // make sure the form has the same number of political groups as the input data
  expect(candidateListNames.length).toBe(results.political_group_votes.length);

  for (const { index, value } of results.political_group_votes.map((value, index) => ({ index, value }))) {
    const candidatesListPage = new CandidatesListPage(page, index, candidateListNames[index]!);
    await expect(candidatesListPage.fieldset).toBeVisible();

    const candidateVotes: number[] = value.candidate_votes.map((candidate) => {
      return candidate.votes;
    });
    const listTotal = value.total;
    await candidatesListPage.fillCandidatesAndTotal(candidateVotes, listTotal);
    await candidatesListPage.next.click();
  }
}

export async function fillDataEntryPagesAndSave(page: Page, results: PollingStationResults) {
  await fillDataEntryPages(page, results);

  const checkAndSavePage = new CheckAndSavePage(page);
  await expect(checkAndSavePage.fieldset).toBeVisible();
  await checkAndSavePage.save.click();

  const dataEntryHomePage = new DataEntryHomePage(page);
  await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  return dataEntryHomePage;
}

export async function uploadElectionAndInputHash(page: Page) {
  const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
  await expect(uploadElectionDefinitionPage.header).toBeVisible();
  await uploadElectionDefinitionPage.uploadFile(eml110a.path);
  await expect(uploadElectionDefinitionPage.main).toContainText(eml110a.filename);
  await expect(uploadElectionDefinitionPage.main).toContainText(eml110a.electionDate);

  const checkDefinitionPage = new CheckElectionDefinitionPgObj(page);
  await expect(checkDefinitionPage.header).toBeVisible();
  await checkDefinitionPage.inputHash(eml110a.hashInput1, eml110a.hashInput2);
}

export async function uploadCandidatesAndInputHash(page: Page) {
  const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
  await expect(uploadCandidateDefinitionPage.header).toBeVisible();
  await uploadCandidateDefinitionPage.uploadFile(eml230b.path);
  await expect(uploadCandidateDefinitionPage.main).toContainText(eml230b.filename);
  await expect(uploadCandidateDefinitionPage.main).toContainText(eml230b.electionDate);

  const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
  await expect(checkCandidateDefinitionPage.header).toBeVisible();
  await checkCandidateDefinitionPage.inputHash(eml230b.hashInput1, eml230b.hashInput2);
}

export async function uploadPollingStations(page: Page, eml = eml110b) {
  const uploadElectionDefinitionPage = new UploadPollingStationDefinitionPgObj(page);
  await expect(uploadElectionDefinitionPage.header).toBeVisible();
  await uploadElectionDefinitionPage.uploadFile(eml.path);
  await expect(uploadElectionDefinitionPage.main).toContainText(eml.filename);

  const checkDefinitionPage = new CheckPollingStationDefinitionPgObj(page);
  await expect(checkDefinitionPage.header).toBeVisible();
  await checkDefinitionPage.next.click();
}

export async function createInvestigation(page: Page, pollingStation: string, reason: string) {
  const electionDetailsPage = new ElectionDetailsPgObj(page);
  await electionDetailsPage.investigationsOverviewButton.click();
  const investigationsOverviewPage = new InvestigationOverviewPgObj(page);
  await investigationsOverviewPage.addInvestigationButton.click();
  const addInvestigationPage = new AddInvestigationPgObj(page);
  await expect(addInvestigationPage.header).toBeVisible();
  await addInvestigationPage.selectPollingStation(pollingStation);
  const investigationReasonPage = new InvestigationReasonPgObj(page);
  await expect(investigationReasonPage.header).toBeVisible();
  await investigationReasonPage.reasonField.fill(reason);
  await investigationReasonPage.nextButton.click();
  const investigationPrintCorrigendumPage = new InvestigationPrintCorrigendumPgObj(page);
  await expect(investigationPrintCorrigendumPage.header).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await investigationPrintCorrigendumPage.downloadLink.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/Model_Na14-2_GR2022_Stembureau_\d+_Bijlage_1.pdf/);
  expect((await stat(await download.path())).size).toBeGreaterThan(1024);
}
