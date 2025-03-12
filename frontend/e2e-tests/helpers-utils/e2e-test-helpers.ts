import { expect, Page } from "@playwright/test";

import { PollingStationResults } from "@/types/generated/openapi";

import {
  CandidatesListPage,
  CheckAndSavePage,
  DifferencesPage,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
} from "../page-objects/data_entry";

export async function fillDataEntry(page: Page, results: PollingStationResults) {
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
    const candidatesListPage = new CandidatesListPage(page, candidateListNames[index] as string);
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
  await checkAndSavePage.save.click();

  const pollingStationChoicePage = new PollingStationChoicePage(page);
  await expect(pollingStationChoicePage.dataEntrySuccess).toBeVisible();
}
