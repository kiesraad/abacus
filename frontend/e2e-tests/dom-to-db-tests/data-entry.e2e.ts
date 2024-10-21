import { expect } from "@playwright/test";
import { formatNumber } from "e2e-tests/e2e-test-utils";
import {
  CandidatesListPage,
  CheckAndSavePage,
  DifferencesPage,
  FewerBallotsFields,
  MoreBallotsFields,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
  VotersCounts,
  VotersRecounts,
  VotesCounts,
} from "e2e-tests/page-objects/data_entry";

import { test } from "./fixtures";
import { pollingStation33 } from "./test-data/PollingStationTestData";

test.describe("full data entry flow", () => {
  test("no recount, no differences", async ({ page }) => {
    await page.goto("/elections/1/data-entry");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();
    const pollingStation = pollingStation33;
    await pollingStationChoicePage.pollingStationNumber.fill(pollingStation.number.toString());
    await expect(pollingStationChoicePage.pollingStationFeedback).toContainText(pollingStation.name);
    await pollingStationChoicePage.clickStart();

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.heading).toBeFocused();
    await recountedPage.no.check();
    await expect(recountedPage.no).toBeChecked();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.heading).toBeFocused();
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
    await expect(differencesPage.heading).toBeFocused();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.heading).toBeFocused();

    await candidatesListPage_1.fillCandidatesAndTotal([837, 253], 1090);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.heading).toBeFocused();

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
    await pollingStationChoicePage.headingNextPollingStation.waitFor();
    await pollingStationChoicePage.dataEntrySuccess.waitFor();
  });

  test("recount, no differences", async ({ page }) => {
    await page.goto("/elections/1/data-entry");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();
    const pollingStation = pollingStation33;
    await pollingStationChoicePage.selectPollingStationAndClickStart(pollingStation.number);

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.heading).toBeVisible();
    await recountedPage.yes.check();
    await expect(recountedPage.yes).toBeChecked();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.heading).toBeVisible();
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
    const votersRecounts: VotersRecounts = {
      poll_card_recount: 987,
      proxy_certificate_recount: 103,
      voter_card_recount: 35,
      total_admitted_voters_recount: 1125,
    };
    await votersAndVotesPage.inputVotersRecounts(votersRecounts);
    await expect(votersAndVotesPage.pollCardRecount).toHaveValue(formatNumber(votersRecounts.poll_card_recount));
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.heading).toBeVisible();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.heading).toBeVisible();

    await candidatesListPage_1.fillCandidatesAndTotal([837, 253], 1090);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.heading).toBeVisible();

    await checkAndSavePage.save.click();

    await pollingStationChoicePage.dataEntrySuccess.waitFor();
  });

  test("no recount, difference of more ballots counted", async ({ page }) => {
    await page.goto("/elections/1/data-entry");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();
    const pollingStation = pollingStation33;
    await pollingStationChoicePage.selectPollingStationAndClickStart(pollingStation.number);

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.heading).toBeVisible();
    await recountedPage.no.check();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.heading).toBeVisible();

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
    await votersAndVotesPage.checkAcceptWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.heading).toBeVisible();

    const moreBallotsFields: MoreBallotsFields = {
      moreBallotsCount: 25,
      tooManyBallotsHandedOutCount: 9,
      otherExplanationCount: 6,
      noExplanationCount: 10,
    };
    await differencesPage.fillMoreBallotsFields(moreBallotsFields);
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.heading).toBeVisible();

    await candidatesListPage_1.fillCandidatesAndTotal([902, 233], 1135);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.heading).toBeVisible();

    await checkAndSavePage.save.click();

    await pollingStationChoicePage.dataEntrySuccess.waitFor();
  });

  test("recount, difference of fewer ballots counted", async ({ page }) => {
    await page.goto("/elections/1/data-entry");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();
    const pollingStation = pollingStation33;
    await pollingStationChoicePage.selectPollingStationAndClickStart(pollingStation.number);

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.heading).toBeVisible();
    await recountedPage.yes.check();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.heading).toBeVisible();
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

    const votersRecounts: VotersRecounts = {
      poll_card_recount: 1020,
      proxy_certificate_recount: 50,
      voter_card_recount: 75,
      total_admitted_voters_recount: 1145,
    };
    await votersAndVotesPage.inputVotersRecounts(votersRecounts);
    await votersAndVotesPage.next.click();

    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText("W.204");
    await expect(votersAndVotesPage.warning).toContainText(
      "Er is een onverwacht verschil tussen het aantal uitgebrachte stemmen (E t/m H) en het herteld aantal toegelaten kiezers (A.2 t/m D.2).",
    );
    await votersAndVotesPage.checkAcceptWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.heading).toBeVisible();

    const fewerBallotsFields: FewerBallotsFields = {
      fewerBallotsCount: 20,
      unreturnedBallotsCount: 6,
      tooFewBallotsHandedOutCount: 3,
      otherExplanationCount: 7,
      noExplanationCount: 4,
    };
    await differencesPage.fillFewerBallotsFields(fewerBallotsFields);
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    await expect(candidatesListPage_1.heading).toBeVisible();

    await candidatesListPage_1.fillCandidatesAndTotal([837, 253], 1090);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await checkAndSavePage.heading.waitFor();
    await checkAndSavePage.save.click();

    await pollingStationChoicePage.dataEntrySuccess.waitFor();
  });

  test("submit with accepted warning on voters and votes page", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

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

    await expect(votersAndVotesPage.heading).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    // accept the warning
    await votersAndVotesPage.checkAcceptWarnings();
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een waarschuwing");

    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    await candidatesListPage_1.heading.waitFor();
    await candidatesListPage_1.fillCandidatesAndTotal([99, 1], 100);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await checkAndSavePage.heading.waitFor();

    await expect(checkAndSavePage.summaryText).toContainText(
      "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn geen blokkerende fouten of waarschuwingen.",
    );

    const expectedSummaryItems = [
      { text: "Alle optellingen kloppen", iconLabel: "opgeslagen" },
      {
        text: "Toegelaten kiezers en uitgebrachte stemmen heeft geaccepteerde waarschuwingen",
        iconLabel: "bevat een waarschuwing",
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
    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await pollingStationChoicePage.headingNextPollingStation.waitFor();
    await pollingStationChoicePage.dataEntrySuccess.waitFor();
  });
});

test.describe("errors and warnings", () => {
  test("correct error on voters and votes page", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

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

    await expect(votersAndVotesPage.heading).toBeVisible();
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
    await differencesPage.heading.waitFor();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("correct error F.204", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

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
    await differencesPage.heading.waitFor();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    // fill counts of List 1 with data that does not match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([2, 1], 3);
    await candidatesListPage_1.next.click();

    await expect(votersAndVotesPage.heading).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.error).toContainText(
      "Controleer (totaal) aantal stemmen op kandidatenF.204De optelling van alle lijsten is niet gelijk aan de invoer bij E.Check of je invoer bij E gelijk is aan het papieren proces-verbaal. En check of je alle lijsten hebt ingevoerd.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );
    await expect(votersAndVotesPage.warning).toBeHidden();

    await votersAndVotesPage.navPanel.list(1).click();
    await expect(candidatesListPage_1.heading).toBeVisible();
    // fill counts of List 1 with data that does match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([70, 30], 100);
    await candidatesListPage_1.next.click();

    const checkAndSavePage = new CheckAndSavePage(page);
    await checkAndSavePage.heading.waitFor();
    await checkAndSavePage.save.click();

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await pollingStationChoicePage.dataEntrySuccess.waitFor();
  });

  test("correct warning on voters and votes page", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

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

    await expect(votersAndVotesPage.proxyCertificateCount).toHaveValue("0");

    await expect(votersAndVotesPage.heading).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );
    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.acceptWarnings).toBeVisible();

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
    await expect(votersAndVotesPage.acceptWarnings).toBeHidden();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("remove option to accept warning on voters and votes page after input change", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

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

    await expect(votersAndVotesPage.heading).toBeVisible();
    await expect(votersAndVotesPage.feedbackHeader).toBeFocused();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await expect(votersAndVotesPage.acceptWarnings).toBeVisible();

    // change input
    await votersAndVotesPage.proxyCertificateCount.fill("7");
    // Tab press needed for page to register change after Playwright's fill()
    await votersAndVotesPage.proxyCertificateCount.press("Tab");
    await expect(votersAndVotesPage.heading).toBeVisible();
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await expect(votersAndVotesPage.acceptWarnings).toBeHidden();
  });
});

test.describe("navigation", () => {
  test("navigate away from Differences page without saving", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();
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
    await expect(differencesPage.heading).toBeVisible();

    await differencesPage.navPanel.votersAndVotes.click();
    await votersAndVotesPage.heading.waitFor();

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

    await expect(recountedPage.heading).toBeVisible();
    await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    // return to VotersAndVotes page and verify change is not saved
    await recountedPage.navPanel.votersAndVotes.click();
    await votersAndVotesPage.heading.waitFor();
    await expect(votersAndVotesPage.pollCardCount).toHaveValue("99");
  });

  test("navigate away from Differences page with saving", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();
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
    await expect(differencesPage.heading).toBeVisible();

    await differencesPage.navPanel.votersAndVotes.click();
    await votersAndVotesPage.heading.waitFor();

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

    await expect(recountedPage.heading).toBeVisible();
    await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    // return to VotersAndVotes page and verify change is saved
    await recountedPage.navPanel.votersAndVotes.click();
    await votersAndVotesPage.heading.waitFor();
    await expect(votersAndVotesPage.pollCardCount).toHaveValue("90");
  });

  test.describe("navigation panel icons", () => {
    test("check icons for accept, active, empty, error, warning, unsaved statuses", async ({ page }) => {
      await page.goto("/elections/1/data-entry/1/recounted");

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.navPanel.recountedIcon).toHaveAccessibleName("je bent hier");
      await recountedPage.checkNoAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await votersAndVotesPage.heading.waitFor();
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

      await votersAndVotesPage.checkAcceptWarnings();
      await votersAndVotesPage.next.click();

      const differencesPage = new DifferencesPage(page);
      await differencesPage.heading.waitFor();
      await expect(differencesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een waarschuwing");
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.navPanel.votersAndVotes.click();

      await votersAndVotesPage.heading.waitFor();
      await expect(votersAndVotesPage.navPanel.differencesIcon).toHaveAccessibleName("nog niet afgerond");
      await votersAndVotesPage.navPanel.differences.click();

      await differencesPage.heading.waitFor();
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
      await candidatesListPage_1.heading.waitFor();
      await expect(candidatesListPage_1.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(candidatesListPage_1.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een waarschuwing");
      await expect(candidatesListPage_1.navPanel.differencesIcon).toHaveAccessibleName("leeg");

      await candidatesListPage_1.fillCandidatesAndTotal([1, 1], 100);
      await candidatesListPage_1.next.click();
      await candidatesListPage_1.navPanel.differences.click();

      await differencesPage.heading.waitFor();
      await expect(differencesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een waarschuwing");
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await expect(differencesPage.navPanel.listIcon(1)).toHaveAccessibleName("bevat een fout");

      await differencesPage.navPanel.list(1).click();
      await candidatesListPage_1.fillCandidatesAndTotal([50, 50], 100);
      await candidatesListPage_1.next.click();
      const checkAndSavePage = new CheckAndSavePage(page);
      await checkAndSavePage.heading.waitFor();
      await expect(checkAndSavePage.navPanel.checkAndSaveIcon).toHaveAccessibleName("je bent hier");
      await expect(checkAndSavePage.navPanel.listIcon(1)).toHaveAccessibleName("opgeslagen");

      await checkAndSavePage.navPanel.list(1).click();
      await expect(candidatesListPage_1.navPanel.checkAndSaveIcon).toHaveAccessibleName("nog niet afgerond");
    });
  });
});
