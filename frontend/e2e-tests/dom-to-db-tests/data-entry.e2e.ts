import { expect, test } from "@playwright/test";
import { CandidatesListPage } from "e2e-tests/page-objects/input/CandidatesListPgObj";
import { DifferencesPage } from "e2e-tests/page-objects/input/DifferencesPgObj";
import { InputPage } from "e2e-tests/page-objects/input/InputPgObj";
import { RecountedPage } from "e2e-tests/page-objects/input/RecountedPgObj";
import { SaveFormPage } from "e2e-tests/page-objects/input/SaveFormPgObj";
import { VotersVotesPage } from "e2e-tests/page-objects/input/VotersVotesPgObj";

import { pollingStation33 } from "./test-data/PollingStationTestData";

test.describe("data entry", () => {
  test("no recount, no differences flow", async ({ page }) => {
    await page.goto("/1/input");

    const inputPage = new InputPage(page);
    const pollingStation = pollingStation33;
    await inputPage.pollingstationNumber.fill(pollingStation.number.toString());
    await expect(inputPage.pollingStationFeedback).toHaveText(pollingStation.name);
    await inputPage.clickStart();

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.no.check();
    await expect(recountedPage.no).toBeChecked();
    await recountedPage.next.click();

    await expect(recountedPage.error).toBeHidden();
    await expect(recountedPage.warning).toBeHidden();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();

    const voters = {
      poll_card_count: "100",
      proxy_certificate_count: "10",
      voter_card_count: "15",
      total_admitted_voters_count: "125",
    };
    const votes = {
      votes_candidates_counts: "122",
      blank_votes_count: "2",
      invalid_votes_count: "1",
      total_votes_cast_count: "125",
    };
    await votersVotesPage.inputVoters(voters);
    await votersVotesPage.inputVotes(votes);

    await expect(votersVotesPage.pollCardCount).toHaveValue(voters.poll_card_count);

    await votersVotesPage.next.click();

    await expect(votersVotesPage.error).toBeHidden();
    await expect(votersVotesPage.warning).toBeHidden();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();
    await differencesPage.next.click();

    await expect(differencesPage.error).toBeHidden();
    await expect(differencesPage.warning).toBeHidden();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    await candidatesListPage_1.heading.waitFor();

    await candidatesListPage_1.fillCandidate(0, 100);
    await candidatesListPage_1.fillCandidate(1, 22);
    await candidatesListPage_1.total.fill("122");
    await candidatesListPage_1.next.click();

    await expect(candidatesListPage_1.error).toBeHidden();
    await expect(candidatesListPage_1.warning).toBeHidden();

    // TODO: Controleren en opslaan
  });
});

test.describe("errors and warnings", () => {
  test("correct error on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in an error
    const votersVotesPage = new VotersVotesPage(page);
    const voters = {
      poll_card_count: "1",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    await votersVotesPage.inputVoters(voters);
    await votersVotesPage.next.click();

    await expect(votersVotesPage.heading).toBeVisible();
    await expect(votersVotesPage.error).toContainText(
      "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );
    await expect(votersVotesPage.warning).toBeHidden();

    // fill form with corrected data (no errors, no warnings)
    const votersCorrected = {
      poll_card_count: "98",
      proxy_certificate_count: "1",
      voter_card_count: "1",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "100",
      blank_votes_count: "0",
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.inputVoters(votersCorrected);
    await votersVotesPage.inputVotes(votes);
    await votersVotesPage.next.click();

    await expect(votersVotesPage.error).toBeHidden();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("correct error F204", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    const voters = {
      poll_card_count: "99",
      proxy_certificate_count: "1",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "100",
      blank_votes_count: "0",
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    // fill counts of List 1 with data that does not match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([2, 1], 3);
    await candidatesListPage_1.next.click();

    await expect(votersVotesPage.heading).toBeVisible();
    await expect(votersVotesPage.error).toBeVisible();
    await expect(votersVotesPage.warning).toBeHidden();

    await votersVotesPage.navPanel.list(1).click();
    await expect(candidatesListPage_1.heading).toBeVisible();
    // fill counts of List 1 with data that does match the total votes on candidates
    await candidatesListPage_1.fillCandidatesAndTotal([70, 30], 100);
    await candidatesListPage_1.next.click();

    const saveFormPage = new SaveFormPage(page);
    await expect(saveFormPage.heading).toBeVisible();
  });

  test("accept warning on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in a warning
    const votersVotesPage = new VotersVotesPage(page);
    const voters = {
      poll_card_count: "100",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "100",
      blank_votes_count: "0",
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersVotesPage.heading).toBeVisible();
    await expect(votersVotesPage.warning).toBeVisible();
    await expect(votersVotesPage.error).toBeHidden();

    // accept the warning
    await votersVotesPage.acceptWarnings.check();
    await votersVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName(
      "bevat een waarschuwing",
    );
  });

  test("correct warning on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in a warning
    const votersVotesPage = new VotersVotesPage(page);
    const voters = {
      poll_card_count: "100",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "100",
      blank_votes_count: "0",
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersVotesPage.proxyCertificateCount).toHaveValue("0");

    await expect(votersVotesPage.heading).toBeVisible();
    await expect(votersVotesPage.warning).toContainText(
      "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );
    await expect(votersVotesPage.error).toBeHidden();
    await expect(votersVotesPage.acceptWarnings).toBeVisible();

    // correct the warning
    const votersCorrected = {
      poll_card_count: "98",
      proxy_certificate_count: "1",
      voter_card_count: "1",
      total_admitted_voters_count: "100",
    };

    await votersVotesPage.inputVoters(votersCorrected);
    // Tab press needed for page to register change after Playwright's fill()
    await votersVotesPage.totalAdmittedVotersCount.press("Tab");
    await votersVotesPage.next.click();

    await expect(votersVotesPage.warning).toBeHidden();
    await expect(votersVotesPage.acceptWarnings).toBeHidden();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();

    await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
  });

  test("remove option to accept warning on voters and votes page after input change", async ({
    page,
  }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    // fill form with data that results in a warning
    const votersVotesPage = new VotersVotesPage(page);
    const voters = {
      poll_card_count: "100",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "100",
      blank_votes_count: "0",
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);

    await expect(votersVotesPage.heading).toBeVisible();
    await expect(votersVotesPage.warning).toBeVisible();

    await expect(votersVotesPage.acceptWarnings).toBeVisible();

    // change input
    await votersVotesPage.proxyCertificateCount.fill("7");
    // Tab press needed for page to register change after Playwright's fill()
    await votersVotesPage.proxyCertificateCount.press("Tab");
    await expect(votersVotesPage.heading).toBeVisible();
    await expect(votersVotesPage.warning).toBeVisible();

    await expect(votersVotesPage.acceptWarnings).toBeHidden();
  });
});

test.describe("navigation", () => {
  test("navigate away from Differences page without saving", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    const voters = {
      poll_card_count: "99",
      proxy_certificate_count: "1",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "100",
      blank_votes_count: "0",
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.heading).toBeVisible();

    await differencesPage.navPanel.votersAndVotes.click();
    await votersVotesPage.heading.waitFor();

    const votersUpdates = {
      poll_card_count: "90",
      proxy_certificate_count: "5",
      voter_card_count: "5",
      total_admitted_voters_count: "100",
    };
    await votersVotesPage.inputVoters(votersUpdates);
    // Tab press needed for page to register change after Playwright's fill()
    await votersVotesPage.totalAdmittedVotersCount.press("Tab");

    // navigate to previous page with unsaved changes
    await votersVotesPage.navPanel.recounted.click();
    await expect(votersVotesPage.unsavedChangesModal.heading).toBeVisible();
    await expect(votersVotesPage.unsavedChangesModal.modal).toContainText(
      "Toegelaten kiezers en uitgebrachte stemmen",
    );
    // do not save changes
    await votersVotesPage.unsavedChangesModal.discardInput.click();

    await expect(recountedPage.heading).toBeVisible();
    await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    // return to VotersAndVotes page and verify change is not saved
    await recountedPage.navPanel.votersAndVotes.click();
    await votersVotesPage.heading.waitFor();
    await expect(votersVotesPage.pollCardCount).toHaveValue("99");
  });

  test("navigate away from Differences page with saving", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    const voters = {
      poll_card_count: "99",
      proxy_certificate_count: "1",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "100",
      blank_votes_count: "0",
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.heading).toBeVisible();

    await differencesPage.navPanel.votersAndVotes.click();
    await votersVotesPage.heading.waitFor();

    const votersUpdates = {
      poll_card_count: "90",
      proxy_certificate_count: "5",
      voter_card_count: "5",
      total_admitted_voters_count: "100",
    };
    await votersVotesPage.inputVoters(votersUpdates);
    // Tab press needed for page to register change after Playwright's fill()
    await votersVotesPage.totalAdmittedVotersCount.press("Tab");

    // navigate to previous page with unsaved changes
    await votersVotesPage.navPanel.recounted.click();
    await expect(votersVotesPage.unsavedChangesModal.heading).toBeVisible();
    await expect(votersVotesPage.unsavedChangesModal.modal).toContainText(
      "Toegelaten kiezers en uitgebrachte stemmen",
    );
    // save changes
    await votersVotesPage.unsavedChangesModal.saveInput.click();

    await expect(recountedPage.heading).toBeVisible(); // fails here because navigated to next page, i.e. Differences
    await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");

    // return to VotersAndVotes page and verify change is saved
    await recountedPage.navPanel.votersAndVotes.click();
    await votersVotesPage.heading.waitFor();
    await expect(votersVotesPage.pollCardCount).toHaveValue("90");
  });

  test.describe("navigation panel icons", () => {
    test("check icons for accept, active, empty, error, warning, unsaved statuses", async ({
      page,
    }) => {
      await page.goto("/1/input/1/recounted");

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.navPanel.recountedIcon).toHaveAccessibleName("je bent hier");
      await recountedPage.checkNoAndClickNext();

      const votersVotesPage = new VotersVotesPage(page);
      await votersVotesPage.heading.waitFor();
      await expect(votersVotesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(votersVotesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName(
        "je bent hier",
      );

      const voters = {
        poll_card_count: "100",
        proxy_certificate_count: "0",
        voter_card_count: "0",
        total_admitted_voters_count: "100",
      };
      const votes = {
        votes_candidates_counts: "100",
        blank_votes_count: "0",
        invalid_votes_count: "0",
        total_votes_cast_count: "100",
      };
      await votersVotesPage.fillInPageAndClickNext(voters, votes);
      await votersVotesPage.acceptWarnings.click();
      await votersVotesPage.next.click();

      const differencesPage = new DifferencesPage(page);
      await differencesPage.heading.waitFor();
      await expect(differencesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName(
        "bevat een waarschuwing",
      );
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.navPanel.votersAndVotes.click();

      await votersVotesPage.heading.waitFor();
      await expect(votersVotesPage.navPanel.differencesIcon).toHaveAccessibleName(
        "nog niet afgerond",
      );
      await votersVotesPage.navPanel.differences.click();

      await differencesPage.heading.waitFor();
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
      await candidatesListPage_1.heading.waitFor();
      await expect(candidatesListPage_1.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(candidatesListPage_1.navPanel.votersAndVotesIcon).toHaveAccessibleName(
        "bevat een waarschuwing",
      );
      await expect(candidatesListPage_1.navPanel.differencesIcon).toHaveAccessibleName("leeg");

      await candidatesListPage_1.fillCandidatesAndTotal([1, 1], 100);
      await candidatesListPage_1.next.click();
      await candidatesListPage_1.navPanel.differences.click();

      await differencesPage.heading.waitFor();
      await expect(differencesPage.navPanel.recountedIcon).toHaveAccessibleName("opgeslagen");
      await expect(differencesPage.navPanel.votersAndVotesIcon).toHaveAccessibleName(
        "bevat een waarschuwing",
      );
      await expect(differencesPage.navPanel.differencesIcon).toHaveAccessibleName("je bent hier");
      await expect(differencesPage.navPanel.listIcon(1)).toHaveAccessibleName("bevat een fout");
    });
  });
});
