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

const machine = createMachine({
  initial: "emptyVotersVotesPage",
  states: {
    pollingStationChoicePage: {},
    pollingStationChoicePageInitialSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageEmptyAfterResume",
      },
    },
    pollingStationChoicePageSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResume",
      },
    },
    recountedPageNo: {},
    emptyVotersVotesPage: {
      on: {
        FILL_WITH_VALID_DATA: "votersVotesPageWithValidData",
        CLICK_ABORT: "immediateAbortInputModal", // separate state needed to distinguish save and resume flow
        NAV_TO_POLLING_STATION_PAGE: "immediateAbortInputModal",
        GO_TO_RECOUNTED_PAGE: "recountedPageNo",
      },
    },
    votersVotesPageWithValidData: {
      on: {
        SUBMIT: "differencesPage",
        CLICK_ABORT: "abortInputModal",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModal",
        // GO_TO_RECOUNTED_PAGE: "recountedPageNo", // TODO: this will cache the non-submitted voters/votes data, but values are not in DOM
      },
    },
    submittedVotersVotesPage: {
      on: {
        CHANGE_VALID_DATA: "votersVotesPageWithChangedValidData",
      },
    },
    votersVotesPageWithChangedValidData: {
      on: {
        // SUBMIT: "differencesPage",
        // TODO: abort and save and check for changed data
        // CLICK_ABORT: "abortInputModal",
        // NAV_TO_POLLING_STATION_PAGE: "abortInputModal",
        GO_TO_RECOUNTED_PAGE: "unsavedChangesModal",
      },
    },
    votersVotesPageAfterResume: {}, // not same votersVotesPageWithValidData because submitted in this case
    votersVotesPageEmptyAfterResume: {}, // same as emptyVotersVotesPage?
    differencesPage: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "submittedVotersVotesPage",
      },
    },
    abortInputModal: {
      on: {
        SAVE_INPUT: "pollingStationChoicePageSaved",
        DISCARD_INPUT: "pollingStationChoicePage",
      },
    },
    immediateAbortInputModal: {
      on: {
        SAVE_INPUT: "pollingStationChoicePageInitialSaved",
        DISCARD_INPUT: "pollingStationChoicePage",
      },
    },
    unsavedChangesModal: {
      on: {
        SAVE_UNSUBMITTED_CHANGES: "recountedPageNo", // goes to Recount page, which is now an end state
        DISCARD_UNSUBMITTED_CHANGES: "recountedPageNo", // goes to Recount page, which is now an end state
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
            emptyVotersVotesPage: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              // TODO: check for empty fields?
            },
            recountedPageNo: async () => {
              await expect(recountedPage.fieldset).toBeVisible();
              await expect(recountedPage.no).toBeChecked();
            },
            votersVotesPageWithValidData: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              // Can't check for values of input fields until after submitting
            },
            votersVotesPageWithChangedValidData: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              // Can't check for values of input fields until after submitting
            },
            immediateAbortInputModal: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            differencesPage: async () => {
              await expect(differencesPage.fieldset).toBeVisible();
            },
            abortInputModal: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            unsavedChangesModal: async () => {
              await expect(recountedPage.unsavedChangesModal.heading).toBeVisible();
            },
            submittedVotersVotesPage: async () => {
              // same as votersVotesPageAfterResume
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(voters);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votes);
            },
            votersVotesPageAfterResume: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const votersFields = await votersAndVotesPage.getVotersCounts();
              expect(votersFields).toStrictEqual(voters);
              const votesFields = await votersAndVotesPage.getVotesCounts();
              expect(votesFields).toStrictEqual(votes);
            },
            votersVotesPageEmptyAfterResume: async () => {
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
            pollingStationChoicePageSaved: async () => {
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).toContainText(
                `${pollingStation1.number} - ${pollingStation1.name}`,
              );
            },
            pollingStationChoicePageInitialSaved: async () => {
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
