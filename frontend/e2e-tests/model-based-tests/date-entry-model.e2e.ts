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

const machine = createMachine({
  initial: "emptyVotersVotesPage",
  states: {
    emptyVotersVotesPage: {
      on: {
        FILL_WITH_VALID_DATA: "votersVotesPageWithValidData",
        ABORT_AND_SAVE: "pollingStationChoicePageSaved",
        ABORT_AND_DELETE: "pollingStationChoicePage",
      },
    },
    votersVotesPageWithValidData: {
      on: {
        SUBMIT: "differencesPage",
        ABORT_AND_SAVE: "pollingStationChoicePageSaved",
        ABORT_AND_DELETE: "pollingStationChoicePage",
      },
    },
    pollingStationChoicePage: {},
    differencesPage: {},
    pollingStationChoicePageSaved: {},
  },
});

const voters: VotersCounts = {
  poll_card_count: 90,
  proxy_certificate_count: 10,
  voter_card_count: 0,
  total_admitted_voters_count: 100,
};

const votes: VotesCounts = {
  votes_candidates_count: 100,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 100,
};

test.describe("My app", () => {
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

        await recountedPage.no.check();
        await recountedPage.next.click();

        await expect(votersAndVotesPage.fieldset).toBeVisible();

        await path.test({
          states: {
            emptyVotersVotesPage: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              // TODO: check for empty fields?
            },
            votersVotesPageWithValidData: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              // TODO: check for filled fields?
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
                `${pollingStation1.number.toString()} - ${pollingStation1.name}`,
              );
            },
            differencesPage: async () => {
              await expect(differencesPage.fieldset).toBeVisible();
            },
          },
          events: {
            FILL_WITH_VALID_DATA: async () => {
              await votersAndVotesPage.inputVotersCounts(voters);
              await votersAndVotesPage.inputVotesCounts(votes);
            },
            ABORT_AND_SAVE: async () => {
              await votersAndVotesPage.abortInput.click();
              await abortModal.saveInput.click();
            },
            ABORT_AND_DELETE: async () => {
              await votersAndVotesPage.abortInput.click();
              await abortModal.discardInput.click();
            },
            SUBMIT: async () => {
              await votersAndVotesPage.next.click();
            },
          },
        });
      });
    });
});
