import { expect } from "@playwright/test";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import {
  CountingDifferencesPollingStationPage,
  noDifferences,
} from "e2e-tests/page-objects/data_entry/CountingDifferencesPollingStationPgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import {
  ExtraInvestigationPage,
  noExtraInvestigation,
} from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { eml230b_with_gaps } from "e2e-tests/test-data/eml-files";
import { dataEntryRequestWithGaps, noErrorsWarningsResponse } from "e2e-tests/test-data/request-response-templates";

import { VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/typist1.json",
  eml230b: eml230b_with_gaps,
});

test.describe("full data entry flow with gaps in party/candidate numbers", () => {
  test("no recount, no differences", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.pollingStationNumber.fill(pollingStation.number.toString());
    await expect(dataEntryHomePage.pollingStationFeedback).toContainText(pollingStation.name);
    await dataEntryHomePage.clickStart();

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.pollCardCount).toBeFocused();
    const voters: VotersCounts = {
      poll_card_count: 2058,
      proxy_certificate_count: 150,
      total_admitted_voters_count: 2208,
    };
    const votes: VotesCounts = {
      political_group_total_votes: [
        { number: 1, total: 2173 },
        { number: 3, total: 0 },
      ],
      total_votes_candidates_count: 2173,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 2208,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);
    await expect(votersAndVotesPage.pollCardCount).toHaveValue(voters.poll_card_count.toString());
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.admittedVotersEqualsVotesCastCheckbox.check();
    await differencesPage.differenceCompletelyAccountedForYes.check();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 0, "Partijdige Partij");
    await expect(candidatesListPage_1.getCandidate(0)).toBeFocused();

    await candidatesListPage_1.fillCandidatesAndTotal([1337, 423, 300, 0, 0, 113, 0], 2173);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 1, "Partij voor de Stemmer");
    await expect(candidatesListPage_2.getCandidate(0)).toBeFocused();

    await candidatesListPage_2.fillCandidatesAndTotal([0, 0], 0);
    const responsePromise = page.waitForResponse(/\/api\/polling_stations\/(\d+)\/data_entries\/([12])/);
    await candidatesListPage_2.next.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toStrictEqual(dataEntryRequestWithGaps);
    expect(await response.json()).toStrictEqual(noErrorsWarningsResponse);

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
      await expect(checkAndSavePage.summaryListItemIcon(expectedItem.text)).toHaveAccessibleName(
        expectedItem.iconLabel,
      );
    }

    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.fieldsetNextPollingStation).toBeVisible();
    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();

    await expect(dataEntryHomePage.alertDataEntrySaved).toHaveText(
      [
        "Je invoer is opgeslagen",
        "Geef het papieren proces-verbaal terug aan de coördinator.",
        "Een andere invoerder doet straks de tweede invoer.",
      ].join(""),
    );
  });
});
