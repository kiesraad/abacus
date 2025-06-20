import { expect } from "@playwright/test";
import {
  fillCandidatesListPages,
  fillDataEntryPages,
  fillDataEntryPagesAndSave,
  selectPollingStationForDataEntry,
} from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
import { formatNumber } from "e2e-tests/helpers-utils/e2e-test-utils";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import {
  DifferencesPage,
  FewerBallotsFields,
  MoreBallotsFields,
} from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import { RecountedPage } from "e2e-tests/page-objects/data_entry/RecountedPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import {
  noErrorsWarningsResponse,
  noRecountNoDifferencesDataEntry,
  noRecountNoDifferencesRequest,
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

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.yes).toBeFocused();
    await recountedPage.no.check();
    await expect(recountedPage.no).toBeChecked();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.pollCardCount).toBeFocused();
    const voters: VotersCounts = {
      poll_card_count: 800,
      proxy_certificate_count: 50,
      voter_card_count: 75,
      total_admitted_voters_count: 925,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 890,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 925,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);
    await expect(votersAndVotesPage.pollCardCount).toHaveValue(formatNumber(voters.poll_card_count));
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.moreBallotsCount).toBeFocused();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.getCandidate(0)).toBeFocused();

    await candidatesListPage_1.fillCandidatesAndTotal([737, 153], 890);
    const responsePromise = page.waitForResponse(new RegExp("/api/polling_stations/(\\d+)/data_entries/([12])"));
    await candidatesListPage_1.next.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toStrictEqual(noRecountNoDifferencesRequest);
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

  test("recount, no differences", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.fieldset).toBeVisible();
    await recountedPage.yes.check();
    await expect(recountedPage.yes).toBeChecked();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 1000,
      proxy_certificate_count: 50,
      voter_card_count: 75,
      total_admitted_voters_count: 1125,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    const votes: VotesCounts = {
      votes_candidates_count: 1090,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 1125,
    };
    await votersAndVotesPage.inputVotesCounts(votes);
    const votersRecounts: VotersCounts = {
      poll_card_count: 987,
      proxy_certificate_count: 103,
      voter_card_count: 35,
      total_admitted_voters_count: 1125,
    };
    await votersAndVotesPage.inputVotersRecounts(votersRecounts);
    await expect(votersAndVotesPage.pollCardRecount).toHaveValue(formatNumber(votersRecounts.poll_card_count));
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.fieldset).toBeVisible();

    await candidatesListPage_1.fillCandidatesAndTotal([837, 253], 1090);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("no recount, difference of more ballots counted", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.fieldset).toBeVisible();
    await recountedPage.no.check();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    const voters: VotersCounts = {
      poll_card_count: 1000,
      proxy_certificate_count: 50,
      voter_card_count: 75,
      total_admitted_voters_count: 1125,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    const votes: VotesCounts = {
      votes_candidates_count: 1135,
      blank_votes_count: 10,
      invalid_votes_count: 5,
      total_votes_cast_count: 1150,
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

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.fieldset).toBeVisible();

    await candidatesListPage_1.fillCandidatesAndTotal([902, 233], 1135);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("recount, difference of fewer ballots counted", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.fieldset).toBeVisible();
    await recountedPage.yes.check();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.headingRecount).toBeVisible();

    const voters: VotersCounts = {
      poll_card_count: 1000,
      proxy_certificate_count: 50,
      voter_card_count: 75,
      total_admitted_voters_count: 1125,
    };
    await votersAndVotesPage.inputVotersCounts(voters);

    const votes: VotesCounts = {
      votes_candidates_count: 1090,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 1125,
    };
    await votersAndVotesPage.inputVotesCounts(votes);

    const votersRecounts: VotersCounts = {
      poll_card_count: 1020,
      proxy_certificate_count: 50,
      voter_card_count: 75,
      total_admitted_voters_count: 1145,
    };
    await votersAndVotesPage.inputVotersRecounts(votersRecounts);
    await votersAndVotesPage.next.click();

    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText("W.204");
    await expect(votersAndVotesPage.warning).toContainText(
      "Er is een onverwacht verschil tussen het aantal uitgebrachte stemmen (E t/m H) en het herteld aantal toegelaten kiezers (A.2 t/m D.2).",
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

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.fieldset).toBeVisible();

    await candidatesListPage_1.fillCandidatesAndTotal([837, 253], 1090);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();
    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("submit with accepted warning on voters and votes page", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in a warning
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    // accept the warning
    await votersAndVotesPage.checkAcceptErrorsAndWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.fieldset).toBeVisible();
    await candidatesListPage_1.fillCandidatesAndTotal([99, 1], 100);
    await candidatesListPage_1.next.click();

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
      `/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/2/recounted`,
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
      `/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/2/recounted`,
    );

    // select different answer than in first data entry
    const recountedPage = new RecountedPage(typistPage);
    await recountedPage.checkYesAndClickNext();

    await expect(recountedPage.feedbackHeader).toBeFocused();
    await expect(recountedPage.warning).toContainText(
      "Verschil met eerste invoer. Extra controle nodigW.001Check of je de gemarkeerde velden goed hebt overgenomen van het papieren proces-verbaal.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );
    await expect(recountedPage.error).toBeHidden();
    await expect(recountedPage.acceptErrorsAndWarnings).toBeVisible();

    await recountedPage.next.click();

    await expect(recountedPage.acceptErrorsAndWarnings).not.toBeChecked();
    await expect(recountedPage.acceptErrorsAndWarningsReminder).toBeVisible();

    // correct selected answer
    await recountedPage.checkNoAndClickNext();

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
      `/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/2/recounted`,
    );

    const recountedPage = new RecountedPage(typistPage);
    await recountedPage.checkNoAndClickNext();

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
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in an error
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 1,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.error).toContainText(
      "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );
    await expect(votersAndVotesPage.warning).toBeHidden();

    // fill form with corrected data (no errors, no warnings)
    const votersCorrected = {
      poll_card_count: 98,
      proxy_certificate_count: 1,
      voter_card_count: 1,
      total_admitted_voters_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(votersCorrected);
    await votersAndVotesPage.next.click();

    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.warning).toBeHidden();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("correct error F.204", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
    // fill counts of List 1 with data that does not match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([2, 1], 3);
    await candidatesListPage_1.next.click();

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.error).toContainText(
      "Controleer (totaal) aantal stemmen op kandidatenF.204De optelling van alle lijsten is niet gelijk aan de invoer bij E.Check of je invoer bij E gelijk is aan het papieren proces-verbaal. En check of je alle lijsten hebt ingevoerd.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );
    await expect(votersAndVotesPage.warning).toBeHidden();

    await votersAndVotesPage.navPanel.list(1).click();
    await expect(candidatesListPage_1.fieldset).toBeVisible();
    // fill counts of List 1 with data that does match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([70, 30], 100);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();
    await checkAndSavePage.save.click();

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();
  });

  test("Changing recounted to yes results in error on differences page", async ({ page, pollingStation }) => {
    await selectPollingStationForDataEntry(page, pollingStation);
    const checkAndSavePage = await fillDataEntryPages(page, noRecountNoDifferencesDataEntry);

    await checkAndSavePage.navPanel.recounted.click();

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkYesAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezersW.204Er is een onverwacht verschil tussen het aantal uitgebrachte stemmen (E t/m H) en het herteld aantal toegelaten kiezers (A.2 t/m D.2).Check of je het papieren proces-verbaal goed hebt overgenomen.",
    );
  });

  test("correct warning on voters and votes page", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in a warning
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );
    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeVisible();

    // correct the warning
    const votersCorrected = {
      poll_card_count: 98,
      proxy_certificate_count: 1,
      voter_card_count: 1,
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

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("remove option to accept warning on voters and votes page after input change", async ({
    page,
    pollingStation,
  }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in a warning
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeVisible();

    // change input
    await votersAndVotesPage.proxyCertificateCount.fill("7");
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.proxyCertificateCount.press("Tab");
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();
  });

  test("User can accept errors", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in an error
    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      votes_candidates_count: 100,
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
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await differencesPage.navPanel.votersAndVotes.click();
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    const votersUpdates: VotersCounts = {
      poll_card_count: 90,
      proxy_certificate_count: 5,
      voter_card_count: 5,
      total_admitted_voters_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(votersUpdates);
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");

    // navigate to previous page with unsaved changes
    await votersAndVotesPage.navPanel.recounted.click();
    await expect(votersAndVotesPage.unsavedChangesModal.heading).toBeVisible();
    await expect(votersAndVotesPage.unsavedChangesModal.heading).toBeFocused();
    await expect(votersAndVotesPage.unsavedChangesModal.modal).toContainText(
      "Toegelaten kiezers en uitgebrachte stemmen",
    );
    // do not save changes
    await votersAndVotesPage.unsavedChangesModal.discardInput.click();

    await expect(recountedPage.fieldset).toBeVisible();
    await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    // return to VotersAndVotes page and verify change is not saved
    await recountedPage.navPanel.votersAndVotes.click();
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.pollCardCount).toHaveValue("99");
  });

  test("navigate away from Differences page with saving", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.fieldset).toBeVisible();

    await differencesPage.navPanel.votersAndVotes.click();
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    const votersUpdates: VotersCounts = {
      poll_card_count: 90,
      proxy_certificate_count: 5,
      voter_card_count: 5,
      total_admitted_voters_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(votersUpdates);
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");

    // navigate to previous page with unsaved changes
    await votersAndVotesPage.navPanel.recounted.click();
    await expect(votersAndVotesPage.unsavedChangesModal.heading).toBeVisible();
    await expect(votersAndVotesPage.unsavedChangesModal.heading).toBeFocused();
    await expect(votersAndVotesPage.unsavedChangesModal.modal).toContainText(
      "Toegelaten kiezers en uitgebrachte stemmen",
    );
    // save changes
    await votersAndVotesPage.unsavedChangesModal.saveInput.click();

    await expect(recountedPage.fieldset).toBeVisible();
    await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    // return to VotersAndVotes page and verify change is saved
    await recountedPage.navPanel.votersAndVotes.click();
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    await expect(votersAndVotesPage.pollCardCount).toHaveValue("90");
  });

  test.describe("navigation panel icons", () => {
    test("check icons for accept, active, empty, error, warning, unsaved statuses", async ({
      page,
      pollingStation,
    }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.navPanel.recountedIcon).toHaveAccessibleName("je bent hier");
      await recountedPage.checkNoAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await expect(votersAndVotesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(votersAndVotesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("je bent hier");

      const voters: VotersCounts = {
        poll_card_count: 100,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 100,
      };
      const votes: VotesCounts = {
        votes_candidates_count: 100,
        blank_votes_count: 0,
        invalid_votes_count: 0,
        total_votes_cast_count: 100,
      };
      await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

      await votersAndVotesPage.checkAcceptErrorsAndWarnings();
      await votersAndVotesPage.next.click();

      const differencesPage = new DifferencesPage(page);
      await expect(differencesPage.fieldset).toBeVisible();
      await expect(differencesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.navPanel.votersAndVotes.click();

      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await expect(votersAndVotesPage.navPanel.differencesIcon).toHaveAccessibleName("nog niet afgerond");
      await votersAndVotesPage.navPanel.differences.click();

      await expect(differencesPage.fieldset).toBeVisible();
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
      await expect(candidatesListPage_1.fieldset).toBeVisible();
      await expect(candidatesListPage_1.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(candidatesListPage_1.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
      await expect(candidatesListPage_1.navPanel.differencesIcon).toHaveAccessibleName("leeg");

      await candidatesListPage_1.fillCandidatesAndTotal([1, 1], 100);
      await candidatesListPage_1.next.click();
      await expect(candidatesListPage_1.error).toBeVisible();
      await candidatesListPage_1.navPanel.differences.click();

      await expect(differencesPage.fieldset).toBeVisible();
      await expect(differencesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await expect(differencesPage.navPanel.listIcon(1)).toHaveAccessibleName("bevat een fout");

      await differencesPage.navPanel.list(1).click();
      await candidatesListPage_1.fillCandidatesAndTotal([50, 50], 100);
      await candidatesListPage_1.next.click();
      const checkAndSavePage = new CheckAndSavePage(page);
      await expect(checkAndSavePage.fieldset).toBeVisible();
      await expect(checkAndSavePage.navPanel.checkAndSaveIcon).toHaveAccessibleName("je bent hier");
      await expect(checkAndSavePage.navPanel.listIcon(1)).toHaveAccessibleName("opgeslagen");

      await checkAndSavePage.navPanel.list(1).click();
      await expect(candidatesListPage_1.navPanel.checkAndSaveIcon).toHaveAccessibleName("nog niet afgerond");
    });
  });
});

test.describe("Check and Save page", () => {
  test("Accept errors to continue", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await dataEntryHomePage.pollingStationNumber.fill(pollingStation.number.toString());
    await dataEntryHomePage.clickStart();

    const recountedPage = new RecountedPage(page);
    await recountedPage.no.check();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 10,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);
    await votersAndVotesPage.next.click();

    await votersAndVotesPage.checkAcceptErrorsAndWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.fewerBallotsCount.fill(`${voters.poll_card_count - votes.total_votes_cast_count}`);
    await differencesPage.next.click();
    await differencesPage.checkAcceptErrorsAndWarnings();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");

    await candidatesListPage_1.fillCandidatesAndTotal([737, 153], 890);
    await candidatesListPage_1.next.click();
    await candidatesListPage_1.checkAcceptErrorsAndWarnings();
    await candidatesListPage_1.next.click();

    await expect(candidatesListPage_1.error).toBeVisible();
    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    const listItemsVotersAndVotes = page
      .getByTestId("save-form-summary-list-voters_votes_counts")
      .getByRole("listitem");

    await expect(listItemsVotersAndVotes).toHaveText([
      "F.202 Controleer uitgebrachte stemmen",
      "F.204 Controleer (totaal) aantal stemmen op kandidaten",
      "W.203 Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
    ]);

    const listItemsDifferences = page.getByTestId("save-form-summary-list-differences_counts").getByRole("listitem");
    await expect(listItemsDifferences).toHaveText(["W.302 Controleer ingevulde verschillen"]);

    await expect(checkAndSavePage.complete).toBeVisible();
    await expect(checkAndSavePage.acceptErrors).toBeVisible();
    await checkAndSavePage.complete.click();

    await expect(checkAndSavePage.acceptErrorsReminder).toBeVisible();

    await checkAndSavePage.acceptErrors.click();
    await expect(checkAndSavePage.acceptErrors).toBeChecked();
    await checkAndSavePage.complete.click();
  });
});
