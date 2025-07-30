import { expect } from "@playwright/test";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { ExtraInvestigationPage } from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { ErrorModalPgObj } from "e2e-tests/page-objects/ErrorModalPgObj";

import { VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/typist.json",
});

test.describe("data entry - api error responses", () => {
  test("UI Warning: Trying to load a data entry that was already claimed", async ({
    typistTwo,
    pollingStationFirstEntryClaimed,
  }) => {
    const { page } = typistTwo;
    const pollingStation = pollingStationFirstEntryClaimed;
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await expect(dataEntryHomePage.alertDataEntryWarning).toBeVisible();
    await expect(dataEntryHomePage.dataEntryWarning).toContainText(
      `Je kan stembureau ${pollingStation.number} niet invoeren`,
    );
    await expect(dataEntryHomePage.alertDataEntryWarning).toContainText(
      "Een andere invoerder is bezig met dit stembureau",
    );
  });

  test("UI Warning: Trying to load the same finalised data entry again", async ({
    page,
    pollingStationFirstEntryDone,
  }) => {
    await page.goto(
      `/elections/${pollingStationFirstEntryDone.election_id}/data-entry/${pollingStationFirstEntryDone.id}/1`,
    );

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await expect(dataEntryHomePage.alertDataEntryWarning).toBeVisible();
    await expect(dataEntryHomePage.dataEntryWarning).toContainText(
      `Je kan stembureau ${pollingStationFirstEntryDone.number} niet invoeren`,
    );
    await expect(dataEntryHomePage.alertDataEntryWarning).toContainText("De invoer voor dit stembureau is al gedaan");
  });

  test("UI Warning: Trying to load a data entry for a polling station with status definitive", async ({
    page,
    pollingStationDefinitive,
  }) => {
    await page.goto(`/elections/${pollingStationDefinitive.election_id}/data-entry/${pollingStationDefinitive.id}/1`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await expect(dataEntryHomePage.alertDataEntryWarning).toBeVisible();
    await expect(dataEntryHomePage.dataEntryWarning).toContainText(
      `Je kan stembureau ${pollingStationDefinitive.number} niet invoeren`,
    );
    await expect(dataEntryHomePage.alertDataEntryWarning).toContainText("De invoer voor dit stembureau is al gedaan");
  });

  test("UI Warning: Trying to load a second data entry when the first is in progress", async ({
    page,
    pollingStationFirstEntryClaimed,
  }) => {
    const pollingStation = pollingStationFirstEntryClaimed;

    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/2`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await expect(dataEntryHomePage.alertDataEntryWarning).toBeVisible();
    await expect(dataEntryHomePage.dataEntryWarning).toContainText(
      `Je kan stembureau ${pollingStation.number} niet invoeren`,
    );
    await expect(dataEntryHomePage.alertDataEntryWarning).toContainText("Er is een ongeldige actie uitgevoerd");
  });

  test("UI Warning: Second data entry user must be different from first entry", async ({
    page,
    pollingStationFirstEntryDone,
  }) => {
    await page.goto(`/elections/${pollingStationFirstEntryDone.election_id}/data-entry`);
    const dataEntryHomePage = new DataEntryHomePage(page);

    await dataEntryHomePage.pollingStationNumber.fill(pollingStationFirstEntryDone.number.toString());

    await expect(dataEntryHomePage.pollingStationFeedback).toContainText(
      `Je mag stembureau ${pollingStationFirstEntryDone.number} niet nog een keer invoeren`,
    );
  });

  test("4xx non-fatal response results in error shown", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await expect(extraInvestigationPage.fieldset).toBeVisible();
    await extraInvestigationPage.inputExtraInvestigation({
      extra_investigation_other_reason: {
        yes: false,
        no: true,
      },
      ballots_recounted_extra_investigation: {
        yes: false,
        no: true,
      },
    });
    await extraInvestigationPage.clickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);

    await page.route(`*/**/api/polling_stations/${pollingStation.id}/data_entries/1`, async (route) => {
      await route.fulfill({
        status: 422,
        json: {
          error: "JSON error or invalid data (Unprocessable Content)",
          fatal: false,
          reference: "InvalidJson",
        },
      });
    });
    await votersAndVotesPage.next.click();

    const errorModal = new ErrorModalPgObj(page);
    await expect(errorModal.dialog).toBeVisible();
    await expect(errorModal.title).toHaveText("Sorry, er ging iets mis");
    await expect(errorModal.text).toHaveText("De JSON is niet geldig");

    await errorModal.close.click();
    await expect(errorModal.dialog).toBeHidden();
    await expect(votersAndVotesPage.fieldset).toBeVisible();
  });

  test("5xx fatal response results in error shown", async ({ page, pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/data-entry/${pollingStation.id}/1`);

    const extraInvestigationPage = new ExtraInvestigationPage(page);
    await expect(extraInvestigationPage.fieldset).toBeVisible();
    await extraInvestigationPage.inputExtraInvestigation({
      extra_investigation_other_reason: {
        yes: false,
        no: true,
      },
      ballots_recounted_extra_investigation: {
        yes: false,
        no: true,
      },
    });
    await extraInvestigationPage.clickNext();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    await expect(votersAndVotesPage.fieldset).toBeVisible();
    const voters: VotersCounts = {
      poll_card_count: 99,
      proxy_certificate_count: 1,
      total_admitted_voters_count: 100,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 100,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 100,
    };
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);

    await page.route(`*/**/api/polling_stations/${pollingStation.id}/data_entries/1`, async (route) => {
      await route.fulfill({
        status: 500,
        json: {
          error: "Internal server error",
          fatal: true,
          reference: "InternalServerError",
        },
      });
    });
    await votersAndVotesPage.next.click();

    const message = page.getByRole("heading", {
      level: 1,
      name: "Abacus is stuk",
    });
    await expect(votersAndVotesPage.fieldset).toBeHidden();
    await expect(message).toBeVisible();
  });
});
