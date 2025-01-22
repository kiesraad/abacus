import { expect, Page } from "@playwright/test";

import { PollingStationResults } from "@kiesraad/api";

import {
  CandidatesListPage,
  CheckAndSavePage,
  DifferencesPage,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
} from "./page-objects/data_entry";

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

  // TODO: is there a better way? from election fixture is not a better way
  const candidateLists = await differencesPage.navPanel.allLists();
  const candidateListNames = await Promise.all(
    candidateLists.map(async (list): Promise<string> => {
      const listName = (await list.textContent()) as string;
      return listName;
    }),
  );

  for (const { index, value } of results.political_group_votes.map((value, index) => ({ index, value }))) {
    const candidatesListPage = new CandidatesListPage(page, candidateListNames[index] as string);
    await expect(candidatesListPage.fieldset).toBeVisible();

    const listTotal = value.total;
    const candidateVotes = value.candidate_votes.map((candidate) => {
      return candidate.votes;
    });

    await candidatesListPage.fillCandidatesAndTotal(candidateVotes, listTotal);
    await candidatesListPage.next.click();
  }

  const checkAndSavePage = new CheckAndSavePage(page);
  await expect(checkAndSavePage.fieldset).toBeVisible();
  await checkAndSavePage.save.click();

  const pollingStationChoicePage = new PollingStationChoicePage(page);
  await expect(pollingStationChoicePage.dataEntrySuccess).toBeVisible();
}
