import { expect, test } from "@playwright/test";

import { InputPage } from "./page-objects/input/InputPage";
import { RecountedPage } from "./page-objects/input/RecountedPage";
import { VotersVotesPage } from "./page-objects/input/VotersVotesPage";

test.describe("Data entry", () => {
  test("no recount flow", async ({ page }) => {
    await page.goto("/1/input");

    const inputPage = new InputPage(page);
    await inputPage.selectPollingStationThroughInputField("33", 'Stembureau "Op Rolletjes"');

    const recountedPage = new RecountedPage(page);
    await recountedPage.submitNotRecounted();

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
  });
});
