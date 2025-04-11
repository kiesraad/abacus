import { expect, Page } from "@playwright/test";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import { RecountedPage } from "e2e-tests/page-objects/data_entry/RecountedPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";

import { PollingStation, PollingStationResults } from "@/api/gen/openapi";

export async function selectPollingStationForDataEntry(page: Page, pollingStation: PollingStation) {
  await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

  const dataEntryHomePage = new DataEntryHomePage(page);
  await expect(dataEntryHomePage.fieldset).toBeVisible();
  await dataEntryHomePage.pollingStationNumber.fill(pollingStation.number.toString());
  await expect(dataEntryHomePage.pollingStationFeedback).toContainText(pollingStation.name);
  await dataEntryHomePage.clickStart();

  const recountedPage = new RecountedPage(page);
  await expect(recountedPage.fieldset).toBeVisible();
  return recountedPage;
}

export async function fillDataEntryPages(page: Page, results: PollingStationResults) {
  const recountedPage = new RecountedPage(page);
  await expect(recountedPage.fieldset).toBeVisible();
  await recountedPage.fillInPageAndClickNext(results.recounted ? results.recounted : false);

  const votersAndVotesPage = new VotersAndVotesPage(page);
  await expect(votersAndVotesPage.fieldset).toBeVisible();
  await votersAndVotesPage.fillInPageAndClickNext(results.voters_counts, results.votes_counts);

  const differencesPage = new DifferencesPage(page);
  await expect(differencesPage.fieldset).toBeVisible();
  await differencesPage.fillInPageAndClickNext(results.differences_counts);

  const candidateListNames: string[] = await differencesPage.navPanel.allListNames();
  // make sure the form has the same number of political groups as the input data
  expect(candidateListNames.length).toBe(results.political_group_votes.length);

  for (const { index, value } of results.political_group_votes.map((value, index) => ({ index, value }))) {
    const candidatesListPage = new CandidatesListPage(page, 1, candidateListNames[index] as string);
    await expect(candidatesListPage.fieldset).toBeVisible();

    const candidateVotes: number[] = value.candidate_votes.map((candidate) => {
      return candidate.votes;
    });
    const listTotal = value.total;
    await candidatesListPage.fillCandidatesAndTotal(candidateVotes, listTotal);
    await candidatesListPage.next.click();
  }

  const checkAndSavePage = new CheckAndSavePage(page);
  await expect(checkAndSavePage.fieldset).toBeVisible();
  return checkAndSavePage;
}

export async function fillDataEntryPagesAndSave(page: Page, results: PollingStationResults) {
  await fillDataEntryPages(page, results);

  const checkAndSavePage = new CheckAndSavePage(page);
  await expect(checkAndSavePage.fieldset).toBeVisible();
  await checkAndSavePage.save.click();

  const dataEntryHomePage = new DataEntryHomePage(page);
  await expect(dataEntryHomePage.dataEntrySuccess).toBeVisible();
  return dataEntryHomePage;
}
