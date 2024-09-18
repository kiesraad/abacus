import { expect } from "@playwright/test";
import {
  AbortInputModal,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
  VotersCounts,
  VotesCounts,
} from "e2e-tests/page-objects/data_entry";

import { test } from "./fixtures";

test.describe("Abort data entry", () => {
  test("Save input from empty voters and votes page", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();

    await votersAndVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: check saved data instead of API call in #137
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.saveInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("POST");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();

    // TODO: extend test as part of epic #137 resume data entry
  });

  test("Save input from voters and votes page with error", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();
    await votersAndVotesPage.voterCardCount.fill("1000");
    await votersAndVotesPage.next.click();
    await expect(votersAndVotesPage.error).toContainText(
      "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
    );

    await votersAndVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: check saved data instead of API call in #137
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.saveInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("POST");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();

    // TODO: extend test as part of epic #137 resume data entry
  });

  test("Save input from voters and votes page with warning", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();
    const voters: VotersCounts = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 50,
      blank_votes_count: 50, // exceeds threshold
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await votersAndVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: check saved data instead of API call in #137
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.saveInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("POST");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();

    // TODO: extend test as part of epic #137 resume data entry
  });

  test("Discard input from empty voters and votes page", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();

    await votersAndVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: replace checking API call with checking form is empty at the end of the test
    // should be done as part of epic #137 resume data entry
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.discardInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("DELETE");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();
  });

  test("Discard input from voters and votes page with error", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();
    await votersAndVotesPage.voterCardCount.fill("1000");
    await votersAndVotesPage.next.click();
    await expect(votersAndVotesPage.error).toBeVisible();

    await votersAndVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: replace checking API call with checking form is empty at the end of the test
    // should be done as part of epic #137 resume data entry
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.discardInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("DELETE");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();
  });

  test("Discard input from voters and votes page with warning", async ({ page }) => {
    await page.goto("/elections/1/data-entry/1/recounted");

    const recountedPage = new RecountedPage(page);
    await recountedPage.heading.waitFor();
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await votersAndVotesPage.heading.waitFor();
    const voters: VotersCounts = {
      poll_card_count: 100,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 50,
      blank_votes_count: 50, // exceeds threshold
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.fillInPageAndClickNext(voters, votes);
    await expect(votersAndVotesPage.warning).toContainText(
      "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    );

    await votersAndVotesPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await abortInputModal.heading.waitFor();

    // TODO: replace checking API call with checking form is empty at the end of the test
    // should be done as part of epic #137 resume data entry
    const responsePromise = page.waitForResponse("**/polling_stations/1/data_entries/1");

    await abortInputModal.discardInput.click();

    const response = await responsePromise;
    expect(response.request().method()).toBe("DELETE");

    const pollingStationChoicePage = new PollingStationChoicePage(page);
    await expect(pollingStationChoicePage.heading).toBeVisible();
  });
});
