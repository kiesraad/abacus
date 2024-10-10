import { expect, Page } from "@playwright/test";
import {
  AbortInputModal,
  CandidatesListPage,
  DifferencesPage,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
  VotersCounts,
  VotesCounts,
} from "e2e-tests/page-objects/data_entry";

import { test } from "./fixtures";
import { emptyDataEntryResponse } from "./test-data/PollingStationTestData";

test.describe("resume data entry flow", () => {
  const fillFirstTwoPagesAndAbort = async (page: Page) => {
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

    await differencesPage.abortInput.click();

    return new AbortInputModal(page);
  };

  test.describe("resume after saving", () => {
    test("resuming data entry shows previous data", async ({ page }) => {
      const abortInputModal = await fillFirstTwoPagesAndAbort(page);
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.saveInput.click();

      const pollingStationChoicePage = new PollingStationChoicePage(page);
      await expect(pollingStationChoicePage.heading).toBeVisible();

      await page.goto("/elections/1/data-entry/1");

      const differencesPage = new DifferencesPage(page);
      await expect(differencesPage.heading).toBeVisible();
      await differencesPage.navPanel.recounted.click();

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.no).toBeChecked();
      await recountedPage.next.click();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.heading).toBeVisible();

      await expect(votersAndVotesPage.pollCardCount).toHaveValue("99");
      await expect(votersAndVotesPage.proxyCertificateCount).toHaveValue("1");
      await expect(votersAndVotesPage.voterCardCount).toBeEmpty();
      await expect(votersAndVotesPage.totalAdmittedVotersCount).toHaveValue("100");

      await expect(votersAndVotesPage.votesCandidatesCount).toHaveValue("100");
      await expect(votersAndVotesPage.blankVotesCount).toBeEmpty();
      await expect(votersAndVotesPage.invalidVotesCount).toBeEmpty();
      await expect(votersAndVotesPage.totalVotesCastCount).toHaveValue("100");

      await votersAndVotesPage.abortInput.click();
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.close.click();
      await expect(votersAndVotesPage.abortInput).toBeFocused();
    });

    // Reproduce issue where navigating between sections is blocked by modal, even though there are no changes.
    // https://github.com/kiesraad/abacus/pull/417#pullrequestreview-2347886699
    test("navigation works after resuming data entry", async ({ page }) => {
      const abortInputModal = await fillFirstTwoPagesAndAbort(page);
      await abortInputModal.saveInput.click();

      const pollingStationChoicePage = new PollingStationChoicePage(page);
      await expect(pollingStationChoicePage.heading).toBeVisible();

      await page.goto("/elections/1/data-entry/1");

      const differencesPage = new DifferencesPage(page);
      await expect(differencesPage.heading).toBeVisible();
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, "Lijst 1 - Political Group A");
      await expect(candidatesListPage_1.heading).toBeVisible();
      await candidatesListPage_1.navPanel.votersAndVotes.click();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.heading).toBeVisible();
      await votersAndVotesPage.navPanel.list(1).click();

      await expect(candidatesListPage_1.heading).toBeVisible();
    });

    test("save input from voters and votes page with error", async ({ page, request }) => {
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
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.saveInput.click();

      const pollingStationChoicePage = new PollingStationChoicePage(page);
      await expect(pollingStationChoicePage.heading).toBeVisible();
      await expect(pollingStationChoicePage.resumeDataEntry).toBeVisible();

      const dataEntryResponse = await request.get(`/api/polling_stations/1/data_entries/1`);
      expect(dataEntryResponse.status()).toBe(200);
      expect(await dataEntryResponse.json()).toMatchObject({
        data: {
          ...emptyDataEntryResponse.data,
          voters_counts: {
            poll_card_count: 0,
            proxy_certificate_count: 0,
            voter_card_count: 1000,
            total_admitted_voters_count: 0,
          },
        },
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_counts.poll_card_count",
                "data.voters_counts.proxy_certificate_count",
                "data.voters_counts.voter_card_count",
                "data.voters_counts.total_admitted_voters_count",
              ],
              code: "F201",
            },
          ],
          warnings: [
            {
              fields: ["data.votes_counts.total_votes_cast_count"],
              code: "W205",
            },
          ],
        },
      });

      await pollingStationChoicePage.selectPollingStationAndClickStart(33);
      await votersAndVotesPage.heading.waitFor();
    });

    test("save input from voters and votes page with warning", async ({ page, request }) => {
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
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.saveInput.click();

      const pollingStationChoicePage = new PollingStationChoicePage(page);
      await expect(pollingStationChoicePage.heading).toBeVisible();

      const dataEntryResponse = await request.get(`/api/polling_stations/1/data_entries/1`);
      expect(dataEntryResponse.status()).toBe(200);
      expect(await dataEntryResponse.json()).toMatchObject({
        data: {
          ...emptyDataEntryResponse.data,
          voters_counts: {
            poll_card_count: 100,
            proxy_certificate_count: 0,
            voter_card_count: 0,
            total_admitted_voters_count: 100,
          },
          votes_counts: {
            votes_candidates_count: 50,
            blank_votes_count: 50,
            invalid_votes_count: 0,
            total_votes_cast_count: 100,
          },
        },
        validation_results: {
          errors: [
            {
              fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes"],
              code: "F204",
            },
          ],
          warnings: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "W201",
            },
          ],
        },
      });

      await pollingStationChoicePage.selectPollingStationAndClickStart(33);
      await votersAndVotesPage.heading.waitFor();
    });
  });

  test.describe("resume after deleting", () => {
    test("deleting data entry doesn't show previous data", async ({ page }) => {
      const abortInputModal = await fillFirstTwoPagesAndAbort(page);
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const pollingStationChoicePage = new PollingStationChoicePage(page);
      await expect(pollingStationChoicePage.heading).toBeVisible();

      await page.goto("/elections/1/data-entry/1/recounted");

      // recounted page should have no option selected
      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.yes).not.toBeChecked();
      await expect(recountedPage.no).not.toBeChecked();
    });

    test("discard input from voters and votes page with error", async ({ page, request }) => {
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
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const pollingStationChoicePage = new PollingStationChoicePage(page);
      await expect(pollingStationChoicePage.heading).toBeVisible();

      const dataEntryResponse = await request.get(`/api/polling_stations/1/data_entries/1`);
      expect(dataEntryResponse.status()).toBe(404);
    });

    test("discard input from voters and votes page with warning", async ({ page, request }) => {
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
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const pollingStationChoicePage = new PollingStationChoicePage(page);
      await expect(pollingStationChoicePage.heading).toBeVisible();

      const dataEntryResponse = await request.get(`/api/polling_stations/1/data_entries/1`);
      expect(dataEntryResponse.status()).toBe(404);
    });
  });
});
