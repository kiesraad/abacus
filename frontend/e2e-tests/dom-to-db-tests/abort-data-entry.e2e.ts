import { expect, test } from "@playwright/test";
import { AbortInputModal } from "e2e-tests/page-objects/input/AbortInputModalPgObj";
import { InputPage } from "e2e-tests/page-objects/input/InputPgObj";
import { RecountedPage } from "e2e-tests/page-objects/input/RecountedPgObj";
import { VotersVotesPage } from "e2e-tests/page-objects/input/VotersVotesPgObj";

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
    await abortInputModal.saveInput.click();

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
    await expect(votersVotesPage.error).toBeVisible();

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();
    await abortInputModal.saveInput.click();

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
    const voters = {
      poll_card_count: "100",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "50",
      blank_votes_count: "50", // exceeds threshold
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);
    await expect(votersVotesPage.warning).toBeVisible();

    await votersVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();
    await abortInputModal.saveInput.click();

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
    const voters = {
      poll_card_count: "100",
      proxy_certificate_count: "0",
      voter_card_count: "0",
      total_admitted_voters_count: "100",
    };
    const votes = {
      votes_candidates_counts: "50",
      blank_votes_count: "50", // exceeds threshold
      invalid_votes_count: "0",
      total_votes_cast_count: "100",
    };
    await votersVotesPage.fillInPageAndClickNext(voters, votes);
    await expect(votersVotesPage.warning).toBeVisible();

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
