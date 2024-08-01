import { expect, test } from "@playwright/test";

import { CandidatesListPage } from "../page-objects/input/CanidatesListPage";
import { DifferencesPage } from "../page-objects/input/DifferencesPage";
import { InputPage } from "../page-objects/input/InputPage";
import { RecountedPage } from "../page-objects/input/RecountedPage";
import { VotersVotesPage } from "../page-objects/input/VotersVotesPage";

test.describe("Data entry", () => {
  test("no recount, no differences flow", async ({ page }) => {
    await page.goto("/1/input");

    const inputPage = new InputPage(page);
    await inputPage.pollingStation.fill("33");
    await expect(inputPage.pollingStationFeedback).toHaveText('Stembureau "Op Rolletjes"');
    await inputPage.clickBeginnen();

    const recountedPage = new RecountedPage(page);
    await recountedPage.no.check();
    await expect(recountedPage.no).toBeChecked();
    await recountedPage.volgende.click();

    await expect(recountedPage.error).toBeHidden();
    await expect(recountedPage.warning).toBeHidden();

    const votersVotesPage = new VotersVotesPage(page);
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

    await expect(page.getByTestId("poll_card_count")).toHaveValue(voters.poll_card_count);

    await votersVotesPage.volgende.click();

    await expect(votersVotesPage.error).toBeHidden();
    await expect(votersVotesPage.warning).toBeHidden();

    await votersVotesPage.verschillen.click(); // TODO: remove once naviation works

    const differencesPage = new DifferencesPage(page);
    await differencesPage.volgende.click();

    await expect(differencesPage.error).toBeHidden();
    await expect(differencesPage.warning).toBeHidden();

    await differencesPage.politicalGroupA.click(); // TODO: remove once naviation works

    const candidatesListPage_1 = new CandidatesListPage(page);
    await candidatesListPage_1.fillCandidate(0, 100);
    await candidatesListPage_1.fillCandidate(1, 22);
    await candidatesListPage_1.total.fill("122");
    await candidatesListPage_1.volgende.click();

    await expect(differencesPage.error).toBeHidden();
    await expect(differencesPage.warning).toBeHidden();

    // TODO: Controleren en opslaan
  });
});

test.describe("errors and warnings", () => {
  test("display error on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/numbers");

    const votersVotesPage = new VotersVotesPage(page);
    const voters = {
      poll_card_count: "1",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    await votersVotesPage.inputVoters(voters);

    await votersVotesPage.volgende.click();

    await expect(votersVotesPage.error).toBeVisible();
    await expect(votersVotesPage.warning).toBeHidden();
  });

  test("display warning on voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/numbers");

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

    await votersVotesPage.volgende.click();

    await expect(votersVotesPage.error).toBeHidden();
    await expect(votersVotesPage.warning).toBeVisible();
  });
});
