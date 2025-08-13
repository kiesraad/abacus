import { expect, Page } from "@playwright/test";
import { loginAs } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import { AbortInputModal } from "e2e-tests/page-objects/data_entry/AbortInputModalPgObj";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import {
  CountingDifferencesPollingStationPage,
  noDifferences,
} from "e2e-tests/page-objects/data_entry/CountingDifferencesPollingStationPgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import {
  ExtraInvestigationPage,
  noExtraInvestigation,
} from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";

import { ClaimDataEntryResponse, PollingStation, VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../../fixtures";
import { emptyDataEntryResponse } from "../../test-data/request-response-templates";

test.use({
  storageState: "e2e-tests/state/typist.json",
});

test.describe("resume data entry flow", () => {
  const fillFirstTwoPagesAndAbort = async (page: Page, pollingStation: PollingStation) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

    const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
    await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      political_group_total_votes: [{ number: 1, total: 100 }],
      total_votes_candidates_count: 100,
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

  test("Closing abort modal with X only closes the modal", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);
    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await extraInvestigationPage.abortInput.click();

    const abortInputModal = new AbortInputModal(page);
    await expect(abortInputModal.heading).toBeVisible();

    let requestMade = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/polling_stations")) {
        requestMade = true;
      }
    });
    await abortInputModal.close.click();
    await expect(abortInputModal.heading).toBeHidden();
    expect(requestMade).toBe(false);

    await expect(extraInvestigationPage.fieldset).toBeVisible();
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
      await differencesPage.progressList.votersAndVotes.click();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();

      await expect(votersAndVotesPage.pollCardCount).toHaveValue("99");
      await expect(votersAndVotesPage.proxyCertificateCount).toHaveValue("1");
      await expect(votersAndVotesPage.totalAdmittedVotersCount).toHaveValue("100");

      await expect(votersAndVotesPage.totalVotesCandidatesCount).toHaveValue("100");
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

      const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
      await expect(candidatesListPage_1.fieldset).toBeVisible();
      await candidatesListPage_1.progressList.votersAndVotes.click();

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.progressList.list(1).click();

      await expect(candidatesListPage_1.fieldset).toBeVisible();
    });

    test("save input from voters and votes page with error", async ({ page, request, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.proxyCertificateCount.fill("1000");
      await votersAndVotesPage.next.click();
      await expect(votersAndVotesPage.error).toContainText(
        "Controleer toegelaten kiezersF.201De invoer bij A, B of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
      );

      await votersAndVotesPage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      await expect(abortInputModal.heading).toBeVisible();
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.saveInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
      await expect(dataEntryHomePage.resumeDataEntry).toBeVisible();

      await loginAs(request, "typist1");
      const dataEntryResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
      expect(dataEntryResponse.status()).toBe(200);
      expect(await dataEntryResponse.json()).toMatchObject({
        data: {
          ...emptyDataEntryResponse.data,
          extra_investigation: noExtraInvestigation,
          counting_differences_polling_station: noDifferences,
          voters_counts: {
            poll_card_count: 0,
            proxy_certificate_count: 1000,
            total_admitted_voters_count: 0,
          },
        },
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_counts.poll_card_count",
                "data.voters_counts.proxy_certificate_count",
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
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      const voters: VotersCounts = {
        poll_card_count: 100,
        proxy_certificate_count: 0,
        total_admitted_voters_count: 100,
      };
      const votes: VotesCounts = {
        political_group_total_votes: [
          { number: 1, total: 50 },
          { number: 2, total: 0 },
          { number: 3, total: 0 },
        ],
        total_votes_candidates_count: 50,
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

      await loginAs(request, "typist1");
      const dataEntryResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
      expect(dataEntryResponse.status()).toBe(200);
      expect(await dataEntryResponse.json()).toMatchObject({
        data: {
          ...emptyDataEntryResponse.data!,
          extra_investigation: noExtraInvestigation,
          counting_differences_polling_station: noDifferences,
          voters_counts: {
            poll_card_count: 100,
            proxy_certificate_count: 0,
            total_admitted_voters_count: 100,
          },
          votes_counts: {
            political_group_total_votes: [
              { number: 1, total: 50 },
              { number: 2, total: 0 },
              { number: 3, total: 0 },
            ],
            total_votes_candidates_count: 50,
            blank_votes_count: 50,
            invalid_votes_count: 0,
            total_votes_cast_count: 100,
          },
        },
        validation_results: {
          errors: [
            {
              fields: ["data.votes_counts.total_votes_candidates_count", "data.political_group_votes"],
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
      } satisfies Partial<ClaimDataEntryResponse>);

      await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
    });

    test("resuming with unsubmitted input (cached data) shows that data", async ({ page, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      const voters: VotersCounts = {
        poll_card_count: 42,
        proxy_certificate_count: 0,
        total_admitted_voters_count: 42,
      };
      await votersAndVotesPage.inputVotersCounts(voters);

      await votersAndVotesPage.abortInput.click();
      const abortInputModal = new AbortInputModal(page);
      await abortInputModal.saveInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await expect(votersAndVotesPage.pollCardCount).toHaveValue("42");
      await expect(votersAndVotesPage.proxyCertificateCount).toBeEmpty();
      await expect(votersAndVotesPage.totalAdmittedVotersCount).toHaveValue("42");
    });

    test("save unsubmitted input when changing voters data works", async ({ page, pollingStation }) => {
      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.inputVotersCounts({
        poll_card_count: 42,
        proxy_certificate_count: 0,
        total_admitted_voters_count: 42,
      });

      await votersAndVotesPage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      const responsePromise = page.waitForResponse(`/api/polling_stations/${pollingStation.id}/data_entries/1`);
      await abortInputModal.saveInput.click();

      const response = await responsePromise;
      expect(response.status()).toBe(200);

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();
    });

    test("save input from check and save page", async ({ typistOne, pollingStation }) => {
      const { page } = typistOne;

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      const voters: VotersCounts = {
        poll_card_count: 3450,
        proxy_certificate_count: 157,
        total_admitted_voters_count: 3607,
      };
      const votes: VotesCounts = {
        political_group_total_votes: [
          { number: 1, total: 3536 },
          { number: 2, total: 36 },
          { number: 3, total: 0 },
        ],
        total_votes_candidates_count: 3572,
        blank_votes_count: 20,
        invalid_votes_count: 15,
        total_votes_cast_count: 3607,
      };
      await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

      const differencesPage = new DifferencesPage(page);
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
      await candidatesListPage_1.fillCandidatesAndTotal([1337, 423, 300, 236, 533, 205, 103, 286, 0, 0, 113, 0], 3536);
      await candidatesListPage_1.next.click();

      const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
      await candidatesListPage_2.fillCandidatesAndTotal([28, 4, 2, 2], 36);
      await candidatesListPage_2.next.click();

      const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
      await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
      await candidatesListPage_3.next.click();

      const checkAndSavePage = new CheckAndSavePage(page);
      await expect(checkAndSavePage.fieldset).toBeVisible();
      await checkAndSavePage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      await expect(abortInputModal.heading).toBeVisible();

      let requestMade = false;
      page.on("request", (request) => {
        if (request.url().includes("/api/polling_stations")) {
          requestMade = true;
        }
      });
      await abortInputModal.saveInput.click();
      await expect(abortInputModal.heading).toBeHidden();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      expect(requestMade).toBe(false);
    });
  });

  test.describe("resume after deleting", () => {
    test("deleting data entry doesn't show previous data", async ({ page, pollingStation }) => {
      const abortInputModal = await fillFirstTwoPagesAndAbort(page, pollingStation);
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      // extra investigation section should be empty
      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await expect(extraInvestigationPage.fieldset).toBeVisible();
      await expect(extraInvestigationPage.extraInvestigationOtherReasonYes).not.toBeChecked();
      await expect(extraInvestigationPage.extraInvestigationOtherReasonNo).not.toBeChecked();
      await expect(extraInvestigationPage.ballotsRecountedYes).not.toBeChecked();
      await expect(extraInvestigationPage.ballotsRecountedNo).not.toBeChecked();
      await extraInvestigationPage.next.click();

      // counting differences polling station section should be empty
      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
      await expect(countingDifferencesPollingStationPage.differenceBallotsPerListYes).not.toBeChecked();
      await expect(countingDifferencesPollingStationPage.differenceBallotsPerListNo).not.toBeChecked();
      await expect(countingDifferencesPollingStationPage.unexplainedDifferenceBallotsVotersYes).not.toBeChecked();
      await expect(countingDifferencesPollingStationPage.unexplainedDifferenceBallotsVotersNo).not.toBeChecked();
      await countingDifferencesPollingStationPage.next.click();

      // voters and votes page should have empty fields
      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.pollCardCount).toBeEmpty();
      await expect(votersAndVotesPage.proxyCertificateCount).toBeEmpty();
    });

    test("discard input from voters and votes page with error", async ({ typistOne, pollingStation }) => {
      const { page, request } = typistOne;

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      await votersAndVotesPage.proxyCertificateCount.fill("1000");
      await votersAndVotesPage.next.click();
      await expect(votersAndVotesPage.error).toBeVisible();

      await votersAndVotesPage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      await expect(abortInputModal.heading).toBeVisible();
      await expect(abortInputModal.heading).toBeFocused();
      await abortInputModal.discardInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      const claimResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
      expect(claimResponse.status()).toBe(200);
      expect(await claimResponse.json()).toMatchObject(emptyDataEntryResponse);
    });

    test("discard input from voters and votes page with warning", async ({ typistOne, pollingStation }) => {
      const { page, request } = typistOne;

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      await expect(votersAndVotesPage.fieldset).toBeVisible();
      const voters: VotersCounts = {
        poll_card_count: 100,
        proxy_certificate_count: 0,
        total_admitted_voters_count: 100,
      };
      const votes: VotesCounts = {
        political_group_total_votes: [
          { number: 1, total: 50 },
          { number: 2, total: 0 },
          { number: 3, total: 0 },
        ],
        total_votes_candidates_count: 50,
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

      const claimResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
      expect(claimResponse.status()).toBe(200);
      expect(await claimResponse.json()).toMatchObject(emptyDataEntryResponse);
    });

    test("discard input from check and save page", async ({ typistOne, pollingStation }) => {
      const { page, request } = typistOne;

      await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

      const extraInvestigationPage = new ExtraInvestigationPage(page);
      await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);

      const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
      await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

      const votersAndVotesPage = new VotersAndVotesPage(page);
      const voters: VotersCounts = {
        poll_card_count: 3450,
        proxy_certificate_count: 157,
        total_admitted_voters_count: 3607,
      };
      const votes: VotesCounts = {
        political_group_total_votes: [
          { number: 1, total: 3536 },
          { number: 2, total: 36 },
          { number: 3, total: 0 },
        ],
        total_votes_candidates_count: 3572,
        blank_votes_count: 20,
        invalid_votes_count: 15,
        total_votes_cast_count: 3607,
      };
      await votersAndVotesPage.fillInPageAndClickNext(voters, votes);

      const differencesPage = new DifferencesPage(page);
      await differencesPage.next.click();

      const candidatesListPage_1 = new CandidatesListPage(page, 1, "Partijdige Partij");
      await candidatesListPage_1.fillCandidatesAndTotal([1337, 423, 300, 236, 533, 205, 103, 286, 0, 0, 113, 0], 3536);
      await candidatesListPage_1.next.click();

      const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst van de Kandidaten");
      await candidatesListPage_2.fillCandidatesAndTotal([28, 4, 2, 2], 36);
      await candidatesListPage_2.next.click();

      const candidatesListPage_3 = new CandidatesListPage(page, 3, "Partij voor de Stemmer");
      await candidatesListPage_3.fillCandidatesAndTotal([0, 0], 0);
      await candidatesListPage_3.next.click();

      const checkAndSavePage = new CheckAndSavePage(page);
      await expect(checkAndSavePage.fieldset).toBeVisible();
      await checkAndSavePage.abortInput.click();

      const abortInputModal = new AbortInputModal(page);
      await expect(abortInputModal.heading).toBeVisible();
      await abortInputModal.discardInput.click();

      const dataEntryHomePage = new DataEntryHomePage(page);
      await expect(dataEntryHomePage.fieldset).toBeVisible();

      const claimResponse = await request.post(`/api/polling_stations/${pollingStation.id}/data_entries/1/claim`);
      expect(claimResponse.status()).toBe(200);
      expect(await claimResponse.json()).toMatchObject(emptyDataEntryResponse);
    });
  });
});
