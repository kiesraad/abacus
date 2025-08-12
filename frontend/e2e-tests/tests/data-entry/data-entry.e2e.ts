import { expect } from "@playwright/test";
import { fillCandidatesListPages, fillDataEntryPagesAndSave } from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import {
  CountingDifferencesPollingStationPage,
  noDifferences,
} from "e2e-tests/page-objects/data_entry/CountingDifferencesPollingStationPgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import {
  DifferencesPage,
  FewerBallotsFields,
  MoreBallotsFields,
} from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import {
  ExtraInvestigationPage,
  noExtraInvestigation,
} from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import {
  dataEntryRequest,
  noErrorsWarningsResponse,
  noRecountNoDifferencesDataEntry,
} from "e2e-tests/test-data/request-response-templates";

import { VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/typist.json",
});

test.describe("full data entry flow", () => {
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
      poll_card_count: 3450,
      proxy_certificate_count: 157,
      total_admitted_voters_count: 3607,
    };
    const votes: VotesCounts = {
      total_votes_candidates_count: 3572,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 3607,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);
    await expect(votersAndVotesPage.pollCardCount).toHaveValue(voters.poll_card_count.toString());
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.moreBallotsCount).toBeFocused();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
    await expect(candidatesListPage_1.getCandidate(0)).toBeFocused();

    await candidatesListPage_1.fillCandidatesAndTotal([1337, 423, 300, 236, 533, 205, 103, 286, 0, 0, 113, 0], 3536);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
    await expect(candidatesListPage_2.getCandidate(0)).toBeFocused();

    await candidatesListPage_2.fillCandidatesAndTotal([28, 4, 2, 2], 36);
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
    await expect(candidatesListPage_3.getCandidate(0)).toBeFocused();

    await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
    const responsePromise = page.waitForResponse(new RegExp("/api/polling_stations/(\\d+)/data_entries/([12])"));
    await candidatesListPage_3.next.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toStrictEqual(dataEntryRequest);
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

  test("no differences", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 3575,
      proxy_certificate_count: 200,
      total_admitted_voters_count: 3775,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    const votes: VotesCounts = {
      total_votes_candidates_count: 3740,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 3775,
    };
    await votersAndVotesPage.inputVotesCounts(votes);
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
    await expect(candidatesListPage_1.fieldset).toBeVisible();
    await candidatesListPage_1.fillCandidatesAndTotal([1265, 400, 324, 236, 533, 205, 103, 286, 0, 0, 113, 0], 3465);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
    await expect(candidatesListPage_2.fieldset).toBeVisible();
    await candidatesListPage_2.fillCandidatesAndTotal([220, 50, 5, 0], 275);
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
    await expect(candidatesListPage_3.fieldset).toBeVisible();
    await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_3.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("difference of more ballots counted", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    const voters: VotersCounts = {
      poll_card_count: 3575,
      proxy_certificate_count: 200,
      total_admitted_voters_count: 3775,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    const votes: VotesCounts = {
      total_votes_candidates_count: 3785,
      blank_votes_count: 10,
      invalid_votes_count: 5,
      total_votes_cast_count: 3800,
    };
    await votersAndVotesPage.inputVotesCounts(votes);
    await votersAndVotesPage.next.click();

    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText("W.203");
    await expect(votersAndVotesPage.warning).toContainText(
      "Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).",
    );
    await votersAndVotesPage.checkAcceptErrorsAndWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    const moreBallotsFields: MoreBallotsFields = {
      more_ballots_count: 25,
      too_many_ballots_handed_out_count: 9,
      other_explanation_count: 6,
      no_explanation_count: 10,
    };
    await differencesPage.fillMoreBallotsFields(moreBallotsFields);
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
    await expect(candidatesListPage_1.fieldset).toBeVisible();
    await candidatesListPage_1.fillCandidatesAndTotal([1265, 400, 324, 236, 533, 205, 103, 286, 0, 0, 113, 0], 3465);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
    await expect(candidatesListPage_2.fieldset).toBeVisible();
    await candidatesListPage_2.fillCandidatesAndTotal([265, 50, 5, 0], 320);
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
    await expect(candidatesListPage_3.fieldset).toBeVisible();
    await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_3.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("difference of fewer ballots counted", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    const voters: VotersCounts = {
      poll_card_count: 3595,
      proxy_certificate_count: 200,
      total_admitted_voters_count: 3795,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    const votes: VotesCounts = {
      total_votes_candidates_count: 3740,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 3775,
    };
    await votersAndVotesPage.inputVotesCounts(votes);

    await votersAndVotesPage.next.click();

    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText("W.203");
    await expect(votersAndVotesPage.warning).toContainText(
      "Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).",
    );
    await votersAndVotesPage.checkAcceptErrorsAndWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    const fewerBallotsFields: FewerBallotsFields = {
      fewer_ballots_count: 20,
      unreturned_ballots_count: 6,
      too_few_ballots_handed_out_count: 3,
      other_explanation_count: 7,
      no_explanation_count: 4,
    };
    await differencesPage.fillFewerBallotsFields(fewerBallotsFields);
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
    await expect(candidatesListPage_1.fieldset).toBeVisible();
    await candidatesListPage_1.fillCandidatesAndTotal([1265, 400, 324, 236, 533, 205, 103, 286, 0, 0, 113, 0], 3465);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
    await expect(candidatesListPage_2.fieldset).toBeVisible();
    await candidatesListPage_2.fillCandidatesAndTotal([220, 50, 5, 0], 275);
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
    await expect(candidatesListPage_3.fieldset).toBeVisible();
    await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_3.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();
    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("submit with accepted warning on voters and votes page", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    // fill form with data that results in a warning
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      total_votes_candidates_count: 50,
      blank_votes_count: 50,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      [
        "Controleer aantal blanco stemmen",
        "W.201",
        "Het aantal blanco stemmen is erg hoog.",
        "Check of je het papieren proces-verbaal goed hebt overgenomen.",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join(""),
    );

    // accept the warning
    await votersAndVotesPage.checkAcceptErrorsAndWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
    await expect(candidatesListPage_1.fieldset).toBeVisible();
    await candidatesListPage_1.fillCandidatesAndTotal([49, 1], 50);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
    await expect(candidatesListPage_2.fieldset).toBeVisible();
    await candidatesListPage_2.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
    await expect(candidatesListPage_3.fieldset).toBeVisible();
    await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_3.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await expect(checkAndSavePage.summaryText).toContainText(
      "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn geen blokkerende fouten of waarschuwingen.",
    );

    const expectedSummaryItems = [
      { text: "Alle optellingen kloppen", iconLabel: "opgeslagen" },
      {
        text: "Toegelaten kiezers en uitgebrachte stemmen heeft geaccepteerde waarschuwingen",
        iconLabel: "opgeslagen",
      },
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
    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldsetNextPollingStation).toBeVisible();
    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("submit with accepted errors on voters and votes, differences and candidate votes pages", async ({
    page,
    pollingStation,
  }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 10,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await votersAndVotesPage.checkAcceptErrorsAndWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.fewerBallotsCount.fill(`${voters.poll_card_count - votes.total_votes_cast_count}`);
    await differencesPage.next.click();
    await differencesPage.checkAcceptErrorsAndWarnings();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
    await candidatesListPage_1.fillCandidatesAndTotal([737, 153], 891);
    await candidatesListPage_1.next.click();
    await expect(candidatesListPage_1.error).toBeVisible();
    await candidatesListPage_1.checkAcceptErrorsAndWarnings();
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
    await candidatesListPage_2.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
    await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_3.next.click();

    await expect(candidatesListPage_2.error).toContainText("F.204");
    await candidatesListPage_2.checkAcceptErrorsAndWarnings();
    await candidatesListPage_2.next.click();

    await expect(candidatesListPage_3.error).toContainText("F.204");
    await candidatesListPage_3.checkAcceptErrorsAndWarnings();
    await candidatesListPage_3.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await expect(checkAndSavePage.summaryListItemVotersAndVotes).toHaveText([
      "F.202 Controleer uitgebrachte stemmen",
      "F.204 Controleer (totaal) aantal stemmen op kandidaten",
      "W.203 Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
    ]);
    await expect(checkAndSavePage.summaryListItemDifferences).toHaveText(["W.302 Controleer ingevulde verschillen"]);
    await expect(checkAndSavePage.summaryListItemPoliticalGroupCandidateVotes1).toHaveText([
      "F.204 Controleer (totaal) aantal stemmen op kandidaten",
      "F.401 Controleer ingevoerde aantallen",
    ]);
    await expect(checkAndSavePage.summaryListItemPoliticalGroupCandidateVotes2).toHaveText([
      "F.204 Controleer (totaal) aantal stemmen op kandidaten",
    ]);

    await expect(checkAndSavePage.complete).toBeVisible();
    await expect(checkAndSavePage.acceptErrors).toBeVisible();
    await checkAndSavePage.complete.click();

    await expect(checkAndSavePage.acceptErrorsReminder).toBeVisible();
    await checkAndSavePage.acceptErrors.click();
    await expect(checkAndSavePage.acceptErrors).toBeChecked();
    await checkAndSavePage.complete.click();

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldsetNextPollingStation).toBeVisible();
    await expect(dataEntryHomePage.dataEntryErrors).toBeVisible();
  });
});

test.describe("second data entry", () => {
  test("equal second data entry after first data entry", async ({
    typistTwo,
    pollingStationFirstEntryDone: pollingStation,
  }) => {
    const { page } = typistTwo;
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.pollingStationNumber.fill(pollingStation.number.toString());
    await expect(dataEntryHomePage.pollingStationFeedback).toContainText(pollingStation.name);
    await dataEntryHomePage.clickStart();

    await expect(page).toHaveURL(
      `/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/2/extra_investigation`,
    );

    await fillDataEntryPagesAndSave(page, noRecountNoDifferencesDataEntry);

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
    await expect(dataEntryHomePage.alertDataEntrySaved).toHaveText(
      ["Je invoer is opgeslagen", "Geef het papieren proces-verbaal terug aan de coördinator."].join(""),
    );

    await expect(dataEntryHomePage.fieldsetNextPollingStation).toBeVisible();
    await dataEntryHomePage.pollingStationNumber.fill(pollingStation.number.toString());
    await expect(dataEntryHomePage.pollingStationFeedback).toContainText(
      "Stembureau 33 (Op Rolletjes) is al twee keer ingevoerd",
    );
    await dataEntryHomePage.clickStart();
    await expect(dataEntryHomePage.pollingStationSubmitFeedback).toContainText(
      "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
    );
  });

  test("different second data entry after first data entry but correct warnings", async ({
    typistTwo,
    coordinator,
    pollingStationFirstEntryDone: pollingStation,
  }) => {
    const typistPage = typistTwo.page;
    await typistPage.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(typistPage);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.pollingStationNumber.fill(pollingStation.number.toString());
    await expect(dataEntryHomePage.pollingStationFeedback).toContainText(pollingStation.name);
    await dataEntryHomePage.clickStart();

    await expect(typistPage).toHaveURL(
      `/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/2/extra_investigation`,
    );

    // fill first section equal to first data entry
    const extraInvestigationPage = new ExtraInvestigationPage(typistPage);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(typistPage);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    // fill form with data that is different from first data entry
    const votersAndVotesPage = new VotersAndVotesPage(typistPage);
    const voters = noRecountNoDifferencesDataEntry.voters_counts;
    const votes = {
      ...noRecountNoDifferencesDataEntry.votes_counts,
      blank_votes_count: noRecountNoDifferencesDataEntry.votes_counts.invalid_votes_count,
      invalid_votes_count: noRecountNoDifferencesDataEntry.votes_counts.blank_votes_count,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Verschil met eerste invoer. Extra controle nodigW.001Check of je de gemarkeerde velden goed hebt overgenomen van het papieren proces-verbaal.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );
    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeVisible();

    // correct warnings
    await votersAndVotesPage.inputVotesCounts(noRecountNoDifferencesDataEntry.votes_counts);

    await votersAndVotesPage.next.click();

    // fill in remaining second data entry equal to first data entry
    const differencesPage = new DifferencesPage(typistPage);
    await expect(differencesPage.fieldset).toBeVisible();
    await differencesPage.fillInPageAndClickNext(noRecountNoDifferencesDataEntry.differences_counts);

    await fillCandidatesListPages(typistPage, noRecountNoDifferencesDataEntry);

    const checkAndSavePage = new CheckAndSavePage(typistPage);
    await expect(checkAndSavePage.fieldset).toBeVisible();
    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
    await expect(dataEntryHomePage.alertDataEntrySaved).toHaveText(
      ["Je invoer is opgeslagen", "Geef het papieren proces-verbaal terug aan de coördinator."].join(""),
    );

    // check if data entries are marked as definitive on coordinator status page
    const coordinatorPage = coordinator.page;
    await coordinatorPage.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(coordinatorPage);
    await expect(electionStatusPage.definitive).toContainText(pollingStation.name);
  });

  test("different second data entry after first data entry", async ({
    typistTwo,
    coordinator,
    pollingStationFirstEntryDone: pollingStation,
  }) => {
    const typistPage = typistTwo.page;
    await typistPage.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(typistPage);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.pollingStationNumber.fill(pollingStation.number.toString());
    await expect(dataEntryHomePage.pollingStationFeedback).toContainText(pollingStation.name);
    await dataEntryHomePage.clickStart();

    await expect(typistPage).toHaveURL(
      `/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/2/extra_investigation`,
    );

    // fill first section equal to first data entry
    const extraInvestigationPage = new ExtraInvestigationPage(typistPage);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    // fill second section equal to first data entry
    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(typistPage);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    // fill form with data that is different from first data entry
    const votersAndVotesPage = new VotersAndVotesPage(typistPage);
    const voters = noRecountNoDifferencesDataEntry.voters_counts;
    const votes = {
      ...noRecountNoDifferencesDataEntry.votes_counts,
      blank_votes_count: noRecountNoDifferencesDataEntry.votes_counts.invalid_votes_count,
      invalid_votes_count: noRecountNoDifferencesDataEntry.votes_counts.blank_votes_count,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Verschil met eerste invoer. Extra controle nodigW.001Check of je de gemarkeerde velden goed hebt overgenomen van het papieren proces-verbaal.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );
    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeVisible();

    // do not correct differences and accept warning
    await votersAndVotesPage.checkAcceptErrorsAndWarnings();
    await votersAndVotesPage.next.click();

    // fill in remaining second data entry equal to first data entry
    const differencesPage = new DifferencesPage(typistPage);
    await expect(differencesPage.fieldset).toBeVisible();
    await differencesPage.fillInPageAndClickNext(noRecountNoDifferencesDataEntry.differences_counts);

    await fillCandidatesListPages(typistPage, noRecountNoDifferencesDataEntry);

    const checkAndSavePage = new CheckAndSavePage(typistPage);
    await expect(checkAndSavePage.fieldset).toBeVisible();
    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntryDifferent).toBeVisible();
    await expect(dataEntryHomePage.alertDataEntryDifferent).toHaveText(
      [
        "Let op: verschil met eerste invoer",
        "Je invoer is opgeslagen. ",
        "Geef het papieren proces-verbaal terug aan de coördinator,",
        "en geef aan dat er een verschil is met de eerste invoer.",
      ].join(""),
    );

    // check if data entries are marked as different on coordinator status page
    const coordinatorPage = coordinator.page;
    await coordinatorPage.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(coordinatorPage);
    await expect(electionStatusPage.errorsAndWarnings).toContainText(pollingStation.name);
  });
});

test.describe("errors and warnings", () => {
  test("correct error on voters and votes page", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    // fill first section without errors or warnings
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    // fill form with data that results in an error
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 1,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.error).toContainText(
      "Controleer toegelaten kiezersF.201De invoer bij A, B of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );
    await expect(votersAndVotesPage.warning).toBeHidden();

    // fill form with corrected data (no errors, no warnings)
    const votersCorrected = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(votersCorrected);
    await votersAndVotesPage.next.click();

    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.warning).toBeHidden();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("correct error F.204", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    // fill extra investigation section without errors or warnings
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };
    const votes = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
    // fill counts of List 1 with data that does not match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([2, 1], 3);
    await candidatesListPage_1.next.click();

    // fill counts of List 2 with 0 so correcting the error is easier
    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
    await candidatesListPage_2.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_2.next.click();

    // fill counts of List 3 with 0 so correcting the error is easier
    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
    await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
    await candidatesListPage_3.next.click();

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.error).toContainText(
      "Controleer (totaal) aantal stemmen op kandidatenF.204De optelling van alle lijsten is niet gelijk aan de invoer bij E.Check of je invoer bij E gelijk is aan het papieren proces-verbaal. En check of je alle lijsten hebt ingevoerd.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );
    await expect(votersAndVotesPage.warning).toBeHidden();

    await votersAndVotesPage.progressList.list(1).click();
    await expect(candidatesListPage_1.fieldset).toBeVisible();
    // fill counts of List 1 with data that does match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([70, 30], 100);
    await candidatesListPage_1.next.click();

    await expect(candidatesListPage_2.fieldset).toBeVisible();
    await candidatesListPage_2.next.click();

    await expect(candidatesListPage_3.fieldset).toBeVisible();
    await candidatesListPage_3.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();
    await checkAndSavePage.save.click();

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("correct warning on voters and votes page", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    // fill extra investigation section without errors or warnings
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    // fill form with data that results in a warning
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 90,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 90,
    };
    const votes = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      [
        "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
        "W.203",
        "Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).",
        "Check of je het papieren proces-verbaal goed hebt overgenomen.",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join(""),
    );
    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeVisible();

    // correct the warning
    const votersCorrected = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };

    await votersAndVotesPage.inputVotersCounts(votersCorrected);
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");
    await votersAndVotesPage.next.click();

    await expect(votersAndVotesPage.warning).toBeHidden();
    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("remove option to accept warning on voters and votes page after input change", async ({
    page,
    pollingStation,
  }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    // fill extra investigation section without errors or warnings
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    // fill form with data that results in a warning
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 90,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 90,
    };
    const votes = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      [
        "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
        "W.203",
        "Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).",
        "Check of je het papieren proces-verbaal goed hebt overgenomen.",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join(""),
    );

    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeVisible();

    // change input
    await votersAndVotesPage.proxyCertificateCount.fill("7");
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.proxyCertificateCount.press("Tab");
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.warning).toContainText(
      [
        "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
        "W.203",
        "Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).",
        "Check of je het papieren proces-verbaal goed hebt overgenomen.",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join(""),
    );

    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();
  });

  test("user can accept errors", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    // fill extra investigation section without errors or warnings
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    // fill form with data that results in an error
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 10,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    await expect(votersAndVotesPage.error).toContainText(
      "Controleer uitgebrachte stemmenF.202De invoer bij E, F, G of H klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.",
    );

    await votersAndVotesPage.acceptErrorsAndWarnings.click();
    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeChecked();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("navigate away from Differences page without saving", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    // fill extra investigation section without errors or warnings
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await differencesPage.progressList.votersAndVotes.click();
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    const votersUpdates: VotersCounts = {
      poll_card_count: 95,
      proxy_certificate_count: 5,
      total_admitted_voters_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(votersUpdates);
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");

    // Test is simplified since we no longer have the recounted page
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.pollCardCount).toHaveValue("95");
  });

  test("navigate away from Differences page with saving", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    // fill extra investigation section without errors or warnings
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      total_votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await differencesPage.progressList.votersAndVotes.click();
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    const votersUpdates: VotersCounts = {
      poll_card_count: 95,
      proxy_certificate_count: 5,
      total_admitted_voters_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(votersUpdates);
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");

    // Test is simplified since we no longer have the recounted page
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.pollCardCount).toHaveValue("95");
  });

  test.describe("progress list icons", () => {
    test("check icons for accept, active, empty, error, warning, unsaved statuses", async ({
      page,
      pollingStation,
    }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await expect(extraInvestigationPage.progressList.extraInvestigationIcon).toHaveAccessibleName("je bent hier");

      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);
      await expect(extraInvestigationPage.progressList.extraInvestigationIcon).toHaveAccessibleName("opgeslagen");

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await expect(
        countingDifferencesPollingStationPage.progressList.countingDifferencesPollingStationIcon,
      ).toHaveAccessibleName("je bent hier");

      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);
      await expect(
        countingDifferencesPollingStationPage.progressList.countingDifferencesPollingStationIcon,
      ).toHaveAccessibleName("opgeslagen");

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await expect(votersAndVotesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("je bent hier");

      const voters: VotersCounts = {
        poll_card_count: 100,
        proxy_certificate_count: 0,
        total_admitted_voters_count: 100,
      };
      const votes: VotesCounts = {
        total_votes_candidates_count: 90,
        blank_votes_count: 10,
        invalid_votes_count: 0,
        total_votes_cast_count: 100,
      };
      await votersAndVotesPage.fillInPageAndClickNext(voters, votes);
      await expect(votersAndVotesPage.warning).toBeVisible();
      await expect(votersAndVotesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("je bent hier");
      await votersAndVotesPage.checkAcceptErrorsAndWarnings();
      await votersAndVotesPage.next.click();

      const differencesPage = new DifferencesPage(page);
      await expect(differencesPage.fieldset).toBeVisible();
      await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.progressList.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.progressList.votersAndVotes.click();

      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await expect(votersAndVotesPage.progressList.differencesIcon).toHaveAccessibleName("nog niet afgerond");
      await votersAndVotesPage.progressList.differences.click();

      await expect(differencesPage.fieldset).toBeVisible();
      await expect(differencesPage.progressList.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
      await expect(candidatesListPage_1.fieldset).toBeVisible();
      await expect(candidatesListPage_1.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
      await expect(candidatesListPage_1.progressList.differencesIcon).toHaveAccessibleName("leeg");

      await candidatesListPage_1.fillCandidatesAndTotal([1, 1], 90);
      await candidatesListPage_1.next.click();
      await expect(candidatesListPage_1.error).toBeVisible();
      await candidatesListPage_1.progressList.differences.click();

      await expect(differencesPage.fieldset).toBeVisible();
      await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.progressList.differencesIcon).toHaveAccessibleName("je bent hier");
      await expect(differencesPage.progressList.listIcon(1)).toHaveAccessibleName("bevat een fout");

      await differencesPage.progressList.list(1).click();
      await candidatesListPage_1.fillCandidatesAndTotal([50, 40], 90);
      await candidatesListPage_1.next.click();

      const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
      await expect(candidatesListPage_2.fieldset).toBeVisible();
      await expect(candidatesListPage_2.progressList.listIcon(2)).toHaveAccessibleName("je bent hier");
      await expect(candidatesListPage_2.progressList.listIcon(1)).toHaveAccessibleName("opgeslagen");

      await candidatesListPage_2.progressList.list(1).click();
      await expect(candidatesListPage_1.progressList.listIcon(2)).toHaveAccessibleName("nog niet afgerond");
      await expect(candidatesListPage_1.progressList.checkAndSaveIcon).toBeHidden();
    });
  });
});
