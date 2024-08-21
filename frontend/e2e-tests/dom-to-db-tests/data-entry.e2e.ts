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
    await recountedPage.waitForPageHeading();
    await recountedPage.no.check();
    await expect(recountedPage.no).toBeChecked();
    await recountedPage.next.click();

    await expect(recountedPage.error).toBeHidden();
    await expect(recountedPage.warning).toBeHidden();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.waitForPageHeading();

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
    await differencesPage.waitForPageHeading();
    await differencesPage.next.click();

    await expect(differencesPage.error).toBeHidden();
    await expect(differencesPage.warning).toBeHidden();

    const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
    await candidatesListPage_1.waitForPageHeading();

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
  test("display error on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.no.click();
    await recountedPage.next.click();

    const votersVotesPage = new VotersVotesPage(page);
    const voters = {
      poll_card_count: "1",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    await votersVotesPage.inputVoters(voters);

    await votersVotesPage.next.click();

    await expect(votersVotesPage.error).toBeVisible();
    await expect(votersVotesPage.warning).toBeHidden();
  });

  test("display warning on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.no.click();
    await recountedPage.next.click();

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
    await votersVotesPage.inputVoters(voters);
    await votersVotesPage.inputVotes(votes);

    await votersVotesPage.next.click();

    await expect(votersVotesPage.warning).toBeVisible();
    await expect(votersVotesPage.error).toBeHidden();
  });

  test("accept warning on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.no.check();
    await recountedPage.next.click();

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
    await votersVotesPage.inputVoters(voters);
    await votersVotesPage.inputVotes(votes);

    await votersVotesPage.next.click();

    await votersVotesPage.acceptWarnings.check();

    await votersVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await differencesPage.waitForPageHeading();

    await expect(differencesPage.navVotersAndVotes).toHaveClass("idle warning");
  });
});

test.describe("abort input modal", () => {
  test("abort input on Recounted paged without saving", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.no.click();
    await recountedPage.next.click();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.waitForPageHeading();
    await expect(votersVotesPage.navRecounted).toHaveClass("idle accept");
    await expect(votersVotesPage.navVotersAndVotes).toHaveClass("active current");
    await votersVotesPage.navRecounted.click();

    await recountedPage.waitForPageHeading();
    await expect(recountedPage.navRecounted).toHaveClass("active accept");
    await expect(recountedPage.navVotersAndVotes).toHaveClass("idle current");
    await recountedPage.yes.click();
    await recountedPage.navVotersAndVotes.click();

    await recountedPage.saveDiscardModal.waitForHeading();

    await recountedPage.saveDiscardModal.discardInput.click();

    await votersVotesPage.waitForPageHeading();
    await expect(votersVotesPage.navRecounted).toHaveClass("idle accept");
    await expect(votersVotesPage.navVotersAndVotes).toHaveClass("active current");
    await votersVotesPage.navRecounted.click();

    await recountedPage.waitForPageHeading();
    await expect(recountedPage.navRecounted).toHaveClass("active accept");
    await expect(recountedPage.navVotersAndVotes).toHaveClass("idle current");
    await expect(recountedPage.no).toBeChecked();
  });

  test("abort input on Recounted paged with saving", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.no.click();
    await recountedPage.next.click();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.waitForPageHeading();
    await expect(votersVotesPage.navRecounted).toHaveClass("idle accept");
    await expect(votersVotesPage.navVotersAndVotes).toHaveClass("active current");
    await votersVotesPage.navRecounted.click();

    await recountedPage.waitForPageHeading();
    await expect(recountedPage.navRecounted).toHaveClass("active accept");
    await expect(recountedPage.navVotersAndVotes).toHaveClass("idle current");
    await recountedPage.yes.click();
    await recountedPage.navVotersAndVotes.click();

    await recountedPage.saveDiscardModal.waitForHeading();
    await recountedPage.saveDiscardModal.saveInput.click();

    await votersVotesPage.waitForPageHeading();
    await expect(votersVotesPage.navRecounted).toHaveClass("idle accept");
    await expect(votersVotesPage.navVotersAndVotes).toHaveClass("active current");
    await votersVotesPage.navRecounted.click();

    await recountedPage.waitForPageHeading();
    await expect(recountedPage.navRecounted).toHaveClass("active accept");
    // TODO: uncomment once class has been fixed, should be same as in test 'abort input on Recounted paged without saving'
    // await expect(recountedPage.navVotersAndVotes).toHaveClass("idle current");
    await expect(recountedPage.yes).toBeChecked();
  });
});
