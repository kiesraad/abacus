import { expect } from "@playwright/test";
import { createTestModel } from "@xstate/graph";
import {
  AbortInputModal,
  DifferencesPage,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
  VotersCounts,
  VotesCounts,
} from "e2e-tests/page-objects/data_entry";
import { createMachine } from "xstate";

import { test } from "../dom-to-db-tests/fixtures";

// TODO:
// - explain naming scheme
// - errors and warnings: fix, accept, abort and save, cache(?)
// - close abort modal, close nav out model, close nav inside modal
// - check if it matters in coverage to merge identical states or events

// model:
// fill in page
//      with valid data
//      with error data
//      with warning data
// submit page
// Invoer afbreken
//      opslaan
//      niet opslaan
//      sluit modal
// naar Is er herteld?
// naar data-entry of elections page
//      bewaren
//      niet bewaren
//      sluit modal
// in-form navigation
// naar recount en gelijk terug naar voters -> niet gesubmitte data in voters blijft
// naar recount en wijziging en terug naar voters -> optie om op te slaan of niet
// naar recount en wijziging en submit

// naamgeving
// pagina's: pollingstation, recounted, votervotes, differences
// data: empty, cached, filled in, submitted/saved, deleted
// change: filled in, cached, saved

const machine = createMachine({
  initial: "voterVotesPageEmpty",
  states: {
    pollingStationsPage: {},
    pollingStationsPageRecountSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeEmpty",
      },
    },
    pollingStationsPageSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResume",
      },
    },
    pollingStationsPageChangesSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeChanged",
      },
    },
    recountedPage: {},
    recountedPageSaved: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageChangedSubmitted",
      },
    },
    recountedPageDiscarded: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageSubmitted",
      },
    },
    recountedPageCached: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "voterVotesPageCached",
      },
    },
    voterVotesPageCached: {
      on: {
        SUBMIT: "differencesPage",
      },
    },
    voterVotesPageEmpty: {
      on: {
        FILL_WITH_VALID_DATA: "votersVotesPageFilled",
        CLICK_ABORT: "abortInputModalEmpty", // separate state needed to distinguish save and resume flow
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalEmpty",
        GO_TO_RECOUNTED_PAGE: "recountedPage",
      },
    },
    votersVotesPageFilled: {
      on: {
        SUBMIT: "differencesPage",
        CLICK_ABORT: "abortInputModalFilled",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalFilled",
        GO_TO_RECOUNTED_PAGE: "recountedPageCached",
      },
    },
    votersVotesPageSubmitted: {
      on: {
        CHANGE_VALID_DATA: "votersVotesPageChangedFilled",
      },
    },
    votersVotesPageChangedSubmitted: {},
    votersVotesPageChangedFilled: {
      on: {
        SUBMIT: "differencesPage",
        CLICK_ABORT: "abortInputModalChanged",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalChanged",
        GO_TO_RECOUNTED_PAGE: "unsavedChangesModalChanged",
      },
    },
    votersVotesPageAfterResume: {}, // not same votersVotesPageFilled because submitted in this case
    votersVotesPageAfterResumeChanged: {},
    votersVotesPageAfterResumeEmpty: {}, // same as voterVotesPageEmpty?
    differencesPage: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageSubmitted",
      },
    },
    abortInputModalFilled: {
      on: {
        SAVE_INPUT: "pollingStationsPageSaved",
        DISCARD_INPUT: "pollingStationsPage",
      },
    },
    abortInputModalEmpty: {
      on: {
        SAVE_INPUT: "pollingStationsPageRecountSaved",
        DISCARD_INPUT: "pollingStationsPage",
      },
    },
    abortInputModalChanged: {
      on: {
        SAVE_INPUT: "pollingStationsPageChangesSaved",
        DISCARD_INPUT: "pollingStationsPage",
      },
    },
    unsavedChangesModalChanged: {
      on: {
        SAVE_UNSUBMITTED_CHANGES: "recountedPageSaved",
        DISCARD_UNSUBMITTED_CHANGES: "recountedPageDiscarded",
      },
    },
  },
});

const voters: VotersCounts = {
  poll_card_count: 90,
  proxy_certificate_count: 10,
  voter_card_count: 0,
  total_admitted_voters_count: 100,
};

const votersChanged: VotersCounts = {
  // TODO: consider changing voters in test, but reset values at start of test
  poll_card_count: 80,
  proxy_certificate_count: 20,
  voter_card_count: 0,
  total_admitted_voters_count: 100,
};

const votes: VotesCounts = {
  votes_candidates_count: 100,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 100,
};

test.describe("Data entry", () => {
  createTestModel(machine)
    .getSimplePaths()
    .forEach((path) => {
      // eslint-disable-next-line playwright/valid-title
      test(path.description, async ({ page, pollingStation1 }) => {
        const pollingStationChoicePage = new PollingStationChoicePage(page);
        const recountedPage = new RecountedPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        const differencesPage = new DifferencesPage(page);
        const abortModal = new AbortInputModal(page);

        await page.goto("/elections/1/data-entry");

        await expect(pollingStationChoicePage.fieldset).toBeVisible();
        await pollingStationChoicePage.pollingStationNumber.fill(pollingStation1.number.toString());
        await expect(pollingStationChoicePage.pollingStationFeedback).toContainText(pollingStation1.name);
        await pollingStationChoicePage.clickStart();

        await expect(recountedPage.fieldset).toBeVisible();
        await recountedPage.no.check();
        await recountedPage.next.click();

        await path.test({
          states: {
            voterVotesPageEmpty: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              // TODO: check for empty fields?
            },
            recountedPage: async () => {
              await expect(recountedPage.fieldset).toBeVisible();
              await expect(recountedPage.no).toBeChecked();
            },
            recountedPageSaved: async () => {
              await expect(recountedPage.fieldset).toBeVisible();
              await expect(recountedPage.no).toBeChecked();
            },
            recountedPageDiscarded: async () => {
              await expect(recountedPage.fieldset).toBeVisible();
              await expect(recountedPage.no).toBeChecked();
            },
            votersVotesPageFilled: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(voters);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votes);
            },
            votersVotesPageChangedFilled: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              // TODO: can check! Can't check for values of input fields until after submitting
            },
            abortInputModalEmpty: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            differencesPage: async () => {
              await expect(differencesPage.fieldset).toBeVisible();
            },
            abortInputModal: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            abortInputModalChanged: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            unsavedChangesModalChanged: async () => {
              await expect(recountedPage.unsavedChangesModal.heading).toBeVisible();
            },
            votersVotesPageSubmitted: async () => {
              // same as votersVotesPageAfterResume
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(voters);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votes);
            },
            votersVotesPageChangedSubmitted: async () => {
              // same as votersVotesPageAfterResumeChanged
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(votersChanged);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votes);
            },
            votersVotesPageAfterResumeChanged: async () => {
              // same as votersVotesPageAfterResumeChanged
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(votersChanged);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votes);
            },
            votersVotesPageAfterResume: async () => {
              // same as votersVotesPageSubmitted
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(voters);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votes);
            },
            votersVotesPageAfterResumeEmpty: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersEmpty: VotersCounts = {
                poll_card_count: 0,
                proxy_certificate_count: 0,
                voter_card_count: 0,
                total_admitted_voters_count: 0,
              };
              const votesEmpty: VotesCounts = {
                votes_candidates_count: 0,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 0,
              };
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(votersEmpty);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votesEmpty);
            },
            pollingStationChoicePage: async () => {
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).not.toContainText(
                `${pollingStation1.number.toString()} - ${pollingStation1.name}`,
              );
            },
            pollingStationsPageSaved: async () => {
              // same as pollingStationsPageRecountSaved
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).toContainText(
                `${pollingStation1.number} - ${pollingStation1.name}`,
              );
            },
            pollingStationsPageRecountSaved: async () => {
              // same as pollingStationsPageSaved
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).toContainText(
                `${pollingStation1.number} - ${pollingStation1.name}`,
              );
            },
          },
          events: {
            FILL_WITH_VALID_DATA: async () => {
              await votersAndVotesPage.inputVotersCounts(voters);
              await votersAndVotesPage.inputVotesCounts(votes);
            },
            CHANGE_VALID_DATA: async () => {
              await votersAndVotesPage.inputVotersCounts(votersChanged);
            },
            CLICK_ABORT: async () => {
              await votersAndVotesPage.abortInput.click();
            },
            NAV_TO_POLLING_STATION_PAGE: async () => {
              // TODO: do not use page
              await page.getByRole("link", { name: "Heemdamseburg" }).click();
            },
            GO_TO_RECOUNTED_PAGE: async () => {
              await votersAndVotesPage.navPanel.recounted.click();
            },
            GO_TO_VOTERS_VOTES_PAGE: async () => {
              await differencesPage.navPanel.votersAndVotes.click();
            },
            SUBMIT: async () => {
              await votersAndVotesPage.next.click();
            },
            SAVE_INPUT: async () => {
              await abortModal.saveInput.click();
            },
            DISCARD_INPUT: async () => {
              await abortModal.discardInput.click();
            },
            SAVE_UNSUBMITTED_CHANGES: async () => {
              await recountedPage.unsavedChangesModal.saveInput.click();
            },
            DISCARD_UNSUBMITTED_CHANGES: async () => {
              await recountedPage.unsavedChangesModal.discardInput.click();
            },
            RESUME_DATA_ENTRY: async () => {
              // TODO: include in page object
              await pollingStationChoicePage.alertDataEntryInProgress
                .getByRole("link", { name: `${pollingStation1.number} - ${pollingStation1.name}` })
                .click();
            },
          },
        });
      });
    });
});
