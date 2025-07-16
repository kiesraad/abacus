import { expect } from "@playwright/test";
import {
  uploadCandidatesAndInputHash,
  uploadElectionAndInputHash,
} from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
import { formatNumber } from "e2e-tests/helpers-utils/e2e-test-utils";
import { CandidatesListPage } from "e2e-tests/page-objects/data_entry/CandidatesListPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import { RecountedPage } from "e2e-tests/page-objects/data_entry/RecountedPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { CheckAndSavePgObj as ElectionCreateCheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { ElectionReport } from "e2e-tests/page-objects/election/ElectionReportPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { OverviewPgObj } from "e2e-tests/page-objects/election/OverviewPgObj";
import { PollingStationFormPgObj } from "e2e-tests/page-objects/polling_station/PollingStationFormPgObj";
import { PollingStationListEmptyPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListEmptyPgObj";
import { PollingStationListPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListPgObj";
import { noErrorsWarningsResponse } from "e2e-tests/test-data/request-response-templates";
import { stat } from "node:fs/promises";

import { VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../fixtures";

test.describe.configure({ mode: "serial" });

let newElectionId = 0;

test.describe("full flow", () => {
  test("create election and polling station", async ({ adminOne }) => {
    const page = adminOne.page;

    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    // Now we should be at the check and save page
    const electionCreateCheckAndSavePage = new ElectionCreateCheckAndSavePgObj(page);
    await expect(electionCreateCheckAndSavePage.header).toBeVisible();
    await electionCreateCheckAndSavePage.save.click();

    await expect(overviewPage.header).toBeVisible();

    // click last link in elections list, which should be the new election
    // TODO: improve this, e.g. by redirecting to new election after creation
    await overviewPage.elections.last().click();

    // get current url
    const url = page.url();
    newElectionId = parseInt(url.split("/")[4] || "");

    await page.goto(`/elections/${newElectionId}/polling-stations`);

    const pollingStationListEmptyPage = new PollingStationListEmptyPgObj(page);
    await pollingStationListEmptyPage.createPollingStation.click();

    const form = new PollingStationFormPgObj(page);

    await form.fillIn({
      number: 42,
      name: "test42",
    });

    await form.create.click();

    const pollingStationListPage = new PollingStationListPgObj(page);
    expect(await pollingStationListPage.alert.textContent()).toContain("Stembureau 42 (test42) toegevoegd");
  });

  test("first data entry", async ({ typistOne }) => {
    // log in as typist1 and do a data entry
    const page = typistOne.page;

    await page.goto(`/elections/${newElectionId}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.pollingStationNumber.fill("42");
    await expect(dataEntryHomePage.pollingStationFeedback).toContainText("test42");
    await dataEntryHomePage.clickStart();

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.yes).toBeFocused();
    await recountedPage.no.check();
    await expect(recountedPage.no).toBeChecked();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters: VotersCounts = {
      poll_card_count: 803,
      proxy_certificate_count: 50,
      voter_card_count: 76,
      total_admitted_voters_count: 929,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 894,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 929,
    };
    await expect(votersAndVotesPage.pollCardCount).toBeFocused();
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);
    await expect(votersAndVotesPage.pollCardCount).toHaveValue(formatNumber(voters.poll_card_count));
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.moreBallotsCount).toBeFocused();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1");
    await expect(candidatesListPage_1.getCandidate(0)).toBeFocused();

    await candidatesListPage_1.fillCandidatesAndTotal([737, 153], 890);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst 2");
    await expect(candidatesListPage_2.getCandidate(0)).toBeFocused();

    await candidatesListPage_2.fillCandidatesAndTotal([3, 1], 4);
    const responsePromise = page.waitForResponse(new RegExp("/api/polling_stations/(\\d+)/data_entries/([12])"));
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Lijst 3");
    await expect(candidatesListPage_3.getCandidate(0)).toBeFocused();
    await candidatesListPage_3.next.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    //expect(response.request().postDataJSON()).toStrictEqual(dataEntryRequest);
    expect(await response.json()).toStrictEqual(noErrorsWarningsResponse);

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await expect(checkAndSavePage.summaryText).toContainText(
      "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn geen blokkerende fouten of waarschuwingen.",
    );

    const expectedSummaryItems = [
      { text: "Alle optellingen kloppen", iconLabel: "opgeslagen" },
      { text: "Er zijn geen blokkerende fouten of waarschuwingen", iconLabel: "opgeslagen" },
      { text: "Je kan de resultaten van dit stembureau opslaan", iconLabel: "opgeslagen" },
    ];
    const listItems = checkAndSavePage.allSummaryListItems();
    const expectedTexts = Array.from(expectedSummaryItems, (item) => item.text);
    await expect(listItems).toHaveText(expectedTexts);

    for (const expectedItem of expectedSummaryItems) {
      await expect(checkAndSavePage.summaryListItemIcon(expectedItem.text)).toHaveAccessibleName(
        expectedItem.iconLabel,
      );
    }

    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.fieldsetNextPollingStation).toBeVisible();
    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();

    await expect(dataEntryHomePage.alertDataEntrySaved).toHaveText(
      [
        "Je invoer is opgeslagen",
        "Geef het papieren proces-verbaal terug aan de coördinator.",
        "Een andere invoerder doet straks de tweede invoer.",
      ].join(""),
    );
  });

  test("second data entry", async ({ typistTwo }) => {
    // log in as typist2 and do a data entry
    const page = typistTwo.page;

    await page.goto(`/elections/${newElectionId}/data-entry`);

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await dataEntryHomePage.pollingStationNumber.fill("42");
    await expect(dataEntryHomePage.pollingStationFeedback).toContainText("test42");
    await dataEntryHomePage.clickStart();

    const recountedPage = new RecountedPage(page);
    await expect(recountedPage.yes).toBeFocused();
    await recountedPage.no.check();
    await expect(recountedPage.no).toBeChecked();
    await recountedPage.next.click();

    const votersAndVotesPage = new VotersAndVotesPage(page);
    const voters: VotersCounts = {
      poll_card_count: 803,
      proxy_certificate_count: 50,
      voter_card_count: 76,
      total_admitted_voters_count: 929,
    };
    const votes: VotesCounts = {
      votes_candidates_count: 894,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 929,
    };
    await expect(votersAndVotesPage.pollCardCount).toBeFocused();
    await votersAndVotesPage.inputVotersCounts(voters);
    await votersAndVotesPage.inputVotesCounts(votes);
    await expect(votersAndVotesPage.pollCardCount).toHaveValue(formatNumber(voters.poll_card_count));
    await votersAndVotesPage.next.click();

    const differencesPage = new DifferencesPage(page);
    await expect(differencesPage.moreBallotsCount).toBeFocused();
    await differencesPage.next.click();

    const candidatesListPage_1 = new CandidatesListPage(page, 1, "Lijst 1");
    await expect(candidatesListPage_1.getCandidate(0)).toBeFocused();

    await candidatesListPage_1.fillCandidatesAndTotal([737, 153], 890);
    await candidatesListPage_1.next.click();

    const candidatesListPage_2 = new CandidatesListPage(page, 2, "Lijst 2");
    await expect(candidatesListPage_2.getCandidate(0)).toBeFocused();

    await candidatesListPage_2.fillCandidatesAndTotal([3, 1], 4);
    const responsePromise = page.waitForResponse(new RegExp("/api/polling_stations/(\\d+)/data_entries/([12])"));
    await candidatesListPage_2.next.click();

    const candidatesListPage_3 = new CandidatesListPage(page, 3, "Lijst 3");
    await expect(candidatesListPage_3.getCandidate(0)).toBeFocused();
    await candidatesListPage_3.next.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    //expect(response.request().postDataJSON()).toStrictEqual(dataEntryRequest);
    expect(await response.json()).toStrictEqual(noErrorsWarningsResponse);

    const checkAndSavePage = new CheckAndSavePage(page);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    await expect(checkAndSavePage.summaryText).toContainText(
      "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn geen blokkerende fouten of waarschuwingen.",
    );

    const expectedSummaryItems = [
      { text: "Alle optellingen kloppen", iconLabel: "opgeslagen" },
      { text: "Er zijn geen blokkerende fouten of waarschuwingen", iconLabel: "opgeslagen" },
      { text: "Je kan de resultaten van dit stembureau opslaan", iconLabel: "opgeslagen" },
    ];
    const listItems = checkAndSavePage.allSummaryListItems();
    const expectedTexts = Array.from(expectedSummaryItems, (item) => item.text);
    await expect(listItems).toHaveText(expectedTexts);

    for (const expectedItem of expectedSummaryItems) {
      await expect(checkAndSavePage.summaryListItemIcon(expectedItem.text)).toHaveAccessibleName(
        expectedItem.iconLabel,
      );
    }

    await checkAndSavePage.save.click();

    await expect(dataEntryHomePage.fieldsetNextPollingStation).toBeVisible();
    await expect(dataEntryHomePage.dataEntrySaved).toBeVisible();

    await expect(dataEntryHomePage.alertDataEntrySaved).toHaveText(
      ["Je invoer is opgeslagen", "Geef het papieren proces-verbaal terug aan de coördinator."].join(""),
    );
  });

  test("downloads a pdf", async ({ coordinator }) => {
    const page = coordinator.page;

    await page.goto(`/elections/${newElectionId}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const electionReportPage = new ElectionReport(page);
    const responsePromise = page.waitForResponse(`/api/elections/${newElectionId}/download_pdf_results`);
    const downloadPromise = page.waitForEvent("download");
    await electionReportPage.downloadPdf.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(await response.headerValue("content-type")).toBe("application/pdf");

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Model_Na31-2_GR2022_Amsterdam.pdf");
    expect((await stat(await download.path())).size).toBeGreaterThan(1024);
  });
});
