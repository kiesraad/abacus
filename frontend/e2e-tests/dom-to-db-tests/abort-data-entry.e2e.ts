import { expect, test } from "@playwright/test";
import { AbortInputModal } from "e2e-tests/page-objects/input/AbortInputModalPgObj";
import { InputPage } from "e2e-tests/page-objects/input/InputPgObj";
import { RecountedPage } from "e2e-tests/page-objects/input/RecountedPgObj";
import { VotersVotesPage } from "e2e-tests/page-objects/input/VotersVotesPgObj";

test.describe("Abort data entry", () => {
  test("Abort and save input from empty voters and votes page", async ({ page }) => {
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
  });

  test("Abort and save input from voters and votes page with error", async ({ page }) => {
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

    // TODO: uncomment once issue 212 implements the expected behavior
    // const inputPage = new InputPage(page);
    // await expect(inputPage.heading).toBeVisible();
  });

  test("Abort and save input from voters and votes page with warning", async ({ page }) => {
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

    // TODO: uncomment once issue 212 implements the expected behavior
    // const inputPage = new InputPage(page);
    // await expect(inputPage.heading).toBeVisible();
  });

  // TODO: same three tests but discard input instead of save input
});
