import { expect, Page } from "@playwright/test";

import { VotersCounts, VotesCounts } from "@kiesraad/api";

import {
  noErrorsWarningsResponse,
  noRecountNoDifferencesRequest,
} from "./dom-to-db-tests/test-data/request-response-templates";
import { formatNumber } from "./e2e-test-utils";
import {
  CandidatesListPage,
  CheckAndSavePage,
  DifferencesPage,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
} from "./page-objects/data_entry";

export async function fillDataEntryNoRecountNoDifferences(page: Page) {
  const recountedPage = new RecountedPage(page);
  await expect(recountedPage.yes).toBeFocused();
  await recountedPage.no.check();
  await expect(recountedPage.no).toBeChecked();
  await recountedPage.next.click();

  const votersAndVotesPage = new VotersAndVotesPage(page);
  await expect(votersAndVotesPage.pollCardCount).toBeFocused();
  const voters: VotersCounts = {
    poll_card_count: 1000,
    proxy_certificate_count: 50,
    voter_card_count: 75,
    total_admitted_voters_count: 1125,
  };
  const votes: VotesCounts = {
    votes_candidates_count: 1090,
    blank_votes_count: 20,
    invalid_votes_count: 15,
    total_votes_cast_count: 1125,
  };
  await votersAndVotesPage.inputVotersCounts(voters);
  await votersAndVotesPage.inputVotesCounts(votes);
  await expect(votersAndVotesPage.pollCardCount).toHaveValue(formatNumber(voters.poll_card_count));
  await votersAndVotesPage.next.click();

  const differencesPage = new DifferencesPage(page);
  await expect(differencesPage.moreBallotsCount).toBeFocused();
  await differencesPage.next.click();

  const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
  await expect(candidatesListPage_1.getCandidate(0)).toBeFocused();

  await candidatesListPage_1.fillCandidatesAndTotal([837, 253], 1090);
  const responsePromise = page.waitForResponse(new RegExp("/api/polling_stations/(\\d+)/data_entries/([12])"));
  await candidatesListPage_1.next.click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject(noRecountNoDifferencesRequest);
  expect(await response.json()).toMatchObject(noErrorsWarningsResponse);

  const checkAndSavePage = new CheckAndSavePage(page);
  await expect(checkAndSavePage.fieldset).toBeVisible();

  await expect(checkAndSavePage.summaryText).toContainText(
    "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn geen blokkerende fouten of waarschuwingen.",
  );

  const expectedSummaryItems = [
    { text: "Alle optellingen kloppen", iconLabel: "opgeslagen" },
    { text: "Er zijn geen blokkerende fouten of waarschuwingen", iconLabel: "opgeslagen" },
    { text: "Je kan de resultaten van dit stembureau opslaan", iconLabel: "opgeslagen" },
  ];
  const listItems = checkAndSavePage.allSummaryListItems();
  const expectedTexts = Array.from(expectedSummaryItems, (item) => item.text);
  await expect(listItems).toHaveText(expectedTexts);

  for (const expectedItem of expectedSummaryItems) {
    await expect(checkAndSavePage.summaryListItemIcon(expectedItem.text)).toHaveAccessibleName(expectedItem.iconLabel);
  }

  await checkAndSavePage.save.click();

  const pollingStationChoicePage = new PollingStationChoicePage(page);
  await expect(pollingStationChoicePage.fieldsetNextPollingStation).toBeVisible();
  await expect(pollingStationChoicePage.dataEntrySuccess).toBeVisible();
}
