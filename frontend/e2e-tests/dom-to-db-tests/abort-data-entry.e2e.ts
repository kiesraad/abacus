import { expect } from "@playwright/test";
import { AbortInputModal } from "e2e-tests/page-objects/input/AbortInputModalPgObj";
import { InputPage } from "e2e-tests/page-objects/input/InputPgObj";
import { RecountedPage } from "e2e-tests/page-objects/input/RecountedPgObj";
import { VotersCounts, VotersVotesPage, VotesCounts } from "e2e-tests/page-objects/input/VotersVotesPgObj";

import { test } from "./fixtures";

test.describe("Abort data entry", () => {
  test("Save input from empty voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: check saved data instead of API call in #137
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.saveInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("POST");

    const inputPage = new InputPage(page);
    await expect(inputPage.heading).toBeVisible();

    // TODO: extend test as part of epic #137 resume data entry
  });

  test("Save input from voters and votes page with error", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    await votersVotesPage.voterCardCount.fill("1000");
    await votersVotesPage.next.click();
    await expect(votersVotesPage.error).toContainText(
      "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: check saved data instead of API call in #137
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.saveInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("POST");

    const inputPage = new InputPage(page);
    await expect(inputPage.heading).toBeVisible();

    // TODO: extend test as part of epic #137 resume data entry
  });

  test("Save input from voters and votes page with warning", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    const voters: VotersCounts = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_counts: 50,
      blank_votes_count: 50, // exceeds threshold
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);
    await expect(votersVotesPage.warning).toContainText(
      "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: check saved data instead of API call in #137
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.saveInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("POST");

    const inputPage = new InputPage(page);
    await expect(inputPage.heading).toBeVisible();

    // TODO: extend test as part of epic #137 resume data entry
  });

  test("Discard input from empty voters and votes page", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: replace checking API call with checking form is empty at the end of the test
    // should be done as part of epic #137 resume data entry
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.discardInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("DELETE");

    const inputPage = new InputPage(page);
    await expect(inputPage.heading).toBeVisible();
  });

  test("Discard input from voters and votes page with error", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    await votersVotesPage.voterCardCount.fill("1000");
    await votersVotesPage.next.click();
    await expect(votersVotesPage.error).toBeVisible();

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: replace checking API call with checking form is empty at the end of the test
    // should be done as part of epic #137 resume data entry
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.discardInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("DELETE");

    const inputPage = new InputPage(page);
    await expect(inputPage.heading).toBeVisible();
  });

  test("Discard input from voters and votes page with warning", async ({ page }) => {
    await page.goto("/1/input/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersVotesPage = new VotersVotesPage(page);
    await votersVotesPage.heading.waitFor();
    const voters: VotersCounts = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_counts: 50,
      blank_votes_count: 50, // exceeds threshold
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);
    await expect(votersVotesPage.warning).toContainText(
      "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: replace checking API call with checking form is empty at the end of the test
    // should be done as part of epic #137 resume data entry
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.discardInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("DELETE");

    const inputPage = new InputPage(page);
    await expect(inputPage.heading).toBeVisible();
  });
});
