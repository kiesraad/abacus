import { expect, test } from "@playwright/test";
import { CandidatesListPage } from "e2e-tests/page-objects/input/CandidatesListPgObj";
import { DifferencesPage } from "e2e-tests/page-objects/input/DifferencesPgObj";
import { InputPage } from "e2e-tests/page-objects/input/InputPgObj";
import { RecountedPage } from "e2e-tests/page-objects/input/RecountedPgObj";
import { VotersVotesPage } from "e2e-tests/page-objects/input/VotersVotesPgObj";

import { pollingStation33 } from "./test-data/PollingStationTestData";

test.describe("Data entry", () => {
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
    await expect(votersVotesPage.error).toBeVisible();
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

    const differencesPage = new DifferencesPage(page);
    await differencesPage.heading.waitFor();

    await expect(differencesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName("opgeslagen");
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

    await expect(differencesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName(
      "bevat een waarschuwing",
    );
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

test.describe("navigate with unsubmitted changes", () => {
  test("navigate away from Recounted page without saving", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("opgeslagen");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName("je bent hier");
    await votersVotesPage.navPanel.Recounted.click();

    await recountedPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("je bent hier");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName(
      "nog niet afgerond",
    );
    await recountedPage.yes.click();
    await recountedPage.navPanel.VotersAndVotes.click();

    await recountedPage.unsavedChangesModal.heading.waitFor();
    await expect(recountedPage.unsavedChangesModal.modal).toContainText("Is er herteld?");

    await recountedPage.unsavedChangesModal.discardInput.click();

    await votersVotesPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("opgeslagen");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName("je bent hier");
    await votersVotesPage.navPanel.Recounted.click();

    await recountedPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("je bent hier");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName(
      "nog niet afgerond",
    );
    await expect(recountedPage.no).toBeChecked();
  });

  test("navigate away from Recounted page with saving", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("opgeslagen");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName("je bent hier");
    await votersVotesPage.navPanel.Recounted.click();

    await recountedPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("je bent hier");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName(
      "nog niet afgerond",
    );
    await recountedPage.yes.click();
    await recountedPage.navPanel.VotersAndVotes.click();

    await recountedPage.unsavedChangesModal.heading.waitFor();
    await expect(recountedPage.unsavedChangesModal.modal).toContainText("Is er herteld?");
    await recountedPage.unsavedChangesModal.saveInput.click();

    await votersVotesPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("opgeslagen");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName("je bent hier");
    await votersVotesPage.navPanel.Recounted.click();

    await recountedPage.heading.waitFor();
    await expect(votersVotesPage.navPanel.RecountedIcon).toHaveAccessibleName("je bent hier");
    await expect(votersVotesPage.navPanel.VotersAndVotesIcon).toHaveAccessibleName(
      "nog niet afgerond",
    );
    await expect(recountedPage.yes).toBeChecked();
  });
});
