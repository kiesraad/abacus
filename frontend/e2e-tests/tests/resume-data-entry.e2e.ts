import { expect, Page } from "@playwright/test";
import {
  AbortInputModal,
  CandidatesListPage,
  DataEntryHomePage,
  DifferencesPage,
  RecountedPage,
  VotersAndVotesPage,
} from "e2e-tests/page-objects/data_entry";

import { PollingStation, VotersCounts, VotesCounts } from "@/api/gen/openapi";

import { test } from "../fixtures";
import { loginAs } from "../setup";
import { emptyDataEntryResponse } from "../test-data/request-response-templates";

test.use({
  storageState: "e2e-tests/state/typist.json",
});

test.describe("resume data entry flow", () => {
  const fillFirstTwoPagesAndAbort = async (page: Page, pollingStation: PollingStation) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

    const recountedPage = new RecountedPage(page);
    await recountedPage.checkNoAndClickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
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
    await expect(differencesPage.fieldset).toBeVisible();

    await differencesPage.abortInput.click();

    return new AbortInputModal(page);
  };

  test.describe("abort data entry", () => {
    test("Closing abort modal with X only closes the modal", async ({ page, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);
      const recountedPage = new RecountedPage(page);
      await recountedPage.no.click();
      await recountedPage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);

      let requestMade = false;
      page.on("request", (request) => {
        if (request.url().includes("/api/polling_stations")) {
          requestMade = true;
        }
      });
      await abortInputModal.close.click();
      expect(requestMade).toBe(false);

      await expect(recountedPage.no).toBeChecked();
    });
  });

  test.describe("resume after saving", () => {
    test("resuming data entry shows previous data", async ({ page, pollingStation }) => {
      const abortInputModal = await fillFirstTwoPagesAndAbort(page, pollingStation);
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.saveInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const differencesPage = new DifferencesPage(page);
      await expect(differencesPage.fieldset).toBeVisible();
      await differencesPage.navPanel.recounted.click();

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.no).toBeChecked();
      await recountedPage.next.click();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();

      await expect(votersAndVotesPage.pollCardCount).toHaveValue("99");
      await expect(votersAndVotesPage.proxyCertificateCount).toHaveValue("1");
      await expect(votersAndVotesPage.voterCardCount).toBeEmpty();
      await expect(votersAndVotesPage.totalAdmittedVotersCount).toHaveValue("100");

      await expect(votersAndVotesPage.votesCandidatesCount).toHaveValue("100");
      await expect(votersAndVotesPage.blankVotesCount).toBeEmpty();
      await expect(votersAndVotesPage.invalidVotesCount).toBeEmpty();
      await expect(votersAndVotesPage.totalVotesCastCount).toHaveValue("100");
    });

    // Reproduce issue where navigating between sections is blocked by modal, even though there are no changes.
    // https://github.com/kiesraad/abacus/pull/417#pullrequestreview-2347886699
    test("navigation works after resuming data entry", async ({ page, pollingStation }) => {
      const abortInputModal = await fillFirstTwoPagesAndAbort(page, pollingStation);
      await abortInputModal.saveInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const differencesPage = new DifferencesPage(page);
      await expect(differencesPage.fieldset).toBeVisible();
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1 - Political Group A");
      await expect(candidatesListPage_1.fieldset).toBeVisible();
      await candidatesListPage_1.navPanel.votersAndVotes.click();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.navPanel.list(1).click();

      await expect(candidatesListPage_1.fieldset).toBeVisible();
    });

    test("save input from voters and votes page with error", async ({ page, request, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.fieldset).toBeVisible();
      await recountedPage.checkNoAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.voterCardCount.fill("1000");
      await votersAndVotesPage.next.click();
      await expect(votersAndVotesPage.error).toContainText(
        "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
      );

      await votersAndVotesPage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      await expect(abortInputModal.heading).toBeVisible();
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.saveInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
      await expect(dataEntryHomePage.resumeDataEntry).toBeVisible();

      await loginAs(request, "typist");
      const dataEntryResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
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

      await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
    });

    test("save input from voters and votes page with warning", async ({ page, request, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.fieldset).toBeVisible();
      await recountedPage.checkNoAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
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
      await expect(abortInputModal.heading).toBeVisible();
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.saveInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      await loginAs(request, "typist");
      const dataEntryResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
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

      await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
    });

    test("resuming with unsubmitted input (cached data) shows that data", async ({ page, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      const recountedPage = new RecountedPage(page);
      await recountedPage.checkNoAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      const voters: VotersCounts = {
        poll_card_count: 42,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 42,
      };
      await votersAndVotesPage.inputVotersCounts(voters);

      await votersAndVotesPage.navPanel.recounted.click();
      await expect(recountedPage.fieldset).toBeVisible();

      await recountedPage.abortInput.click();
      const abortInputModal = new AbortInputModal(page);
      await abortInputModal.saveInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

      await expect(recountedPage.fieldset).toBeVisible();
      await recountedPage.navPanel.votersAndVotes.click();

      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await expect(votersAndVotesPage.pollCardCount).toHaveValue("42");
      await expect(votersAndVotesPage.proxyCertificateCount).toBeEmpty();
      await expect(votersAndVotesPage.voterCardCount).toBeEmpty();
      await expect(votersAndVotesPage.totalAdmittedVotersCount).toHaveValue("42");
    });

    test("save unsubmitted input when changing recounted works", async ({ page, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      const recountedPage = new RecountedPage(page);
      await recountedPage.checkYesAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.inputVotersCounts({
        poll_card_count: 42,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 42,
      });
      await votersAndVotesPage.inputVotersRecounts({
        poll_card_count: 100,
        proxy_certificate_count: 0,
        total_admitted_voters_count: 0,
        voter_card_count: 100,
      });

      await votersAndVotesPage.navPanel.recounted.click();
      await expect(recountedPage.fieldset).toBeVisible();
      await recountedPage.no.click();
      await recountedPage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      const responsePromise = page.waitForResponse(`/api/polling_stations/${pollingStation.id}/data_entries/1`);
      await abortInputModal.saveInput.click();

      const response = await responsePromise;
      expect(response.status()).toBe(200);

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
    });
  });

  test.describe("resume after deleting", () => {
    test("deleting data entry doesn't show previous data", async ({ page, pollingStation }) => {
      const abortInputModal = await fillFirstTwoPagesAndAbort(page, pollingStation);
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      // recounted page should have no option selected
      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.yes).not.toBeChecked();
      await expect(recountedPage.no).not.toBeChecked();
    });

    test("discard input from voters and votes page with error", async ({ page, request, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.fieldset).toBeVisible();
      await recountedPage.checkNoAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.voterCardCount.fill("1000");
      await votersAndVotesPage.next.click();
      await expect(votersAndVotesPage.error).toBeVisible();

      await votersAndVotesPage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      await expect(abortInputModal.heading).toBeVisible();
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      await loginAs(request, "typist");
      const claimResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
      expect(claimResponse.status()).toBe(200);
      expect(await claimResponse.json()).toMatchObject(emptyDataEntryResponse);
    });

    test("discard input from voters and votes page with warning", async ({ page, request, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1/recounted`);

      const recountedPage = new RecountedPage(page);
      await expect(recountedPage.fieldset).toBeVisible();
      await recountedPage.checkNoAndClickNext();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
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
      await expect(abortInputModal.heading).toBeVisible();
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      await loginAs(request, "typist");
      const claimResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
      expect(claimResponse.status()).toBe(200);
      expect(await claimResponse.json()).toMatchObject(emptyDataEntryResponse);
    });
  });
});
