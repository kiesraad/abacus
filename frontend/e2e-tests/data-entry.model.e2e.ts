import { expect } from "@playwright/test";
import { createTestModel } from "@xstate/graph";
import {
  AbortInputModal,
  DifferencesPage,
  PollingStationChoicePage,
  RecountedPage,
  VotersAndVotesPage,
} from "e2e-tests/page-objects/data_entry";
import { createMachine } from "xstate";

import { VotersCounts, VotesCounts } from "@kiesraad/api";

import { test } from "./fixtures";

/*
Not covered in the model:
- fill in page with error data, then fix, nav, abort
- fill in page with warning data, then fix, accept, nav abort
*/

/*
The names of the states in the machine keep track of two states:
1. the current page
2. the state of the data on the voters and votes page

So the state pollingStationsPageChangedSaved means that we're on the polling stations page, we have
changed the initial input on the voters and votes page, and we have saved it as part of navigating
to the polling stations page.
*/

const machine = createMachine({
  initial: "voterVotesPageEmpty",
  states: {
    pollingStationsPageDiscarded: {},
    pollingStationsPageEmptySaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeEmpty",
      },
    },
    pollingStationsPageFilledSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeSaved",
      },
    },
    pollingStationsPageChangedSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeChanged",
      },
    },
    recountedPageEmpty: {},
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
        CLICK_ABORT: "abortInputModalEmpty",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalEmpty",
        GO_TO_RECOUNTED_PAGE: "recountedPageEmpty",
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
    votersVotesPageAfterResumeSaved: {},
    votersVotesPageAfterResumeChanged: {},
    votersVotesPageAfterResumeEmpty: {},
    differencesPage: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageSubmitted",
      },
    },
    abortInputModalFilled: {
      on: {
        SAVE_INPUT: "pollingStationsPageFilledSaved",
        DISCARD_INPUT: "pollingStationsPageDiscarded",
      },
    },
    abortInputModalEmpty: {
      on: {
        SAVE_INPUT: "pollingStationsPageEmptySaved",
        DISCARD_INPUT: "pollingStationsPageDiscarded",
      },
    },
    abortInputModalChanged: {
      on: {
        SAVE_INPUT: "pollingStationsPageChangedSaved",
        DISCARD_INPUT: "pollingStationsPageDiscarded",
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
  poll_card_count: 80,
  proxy_certificate_count: 20,
  voter_card_count: 0,
  total_admitted_voters_count: 100,
};

const votersEmpty: VotersCounts = {
  poll_card_count: 0,
  proxy_certificate_count: 0,
  voter_card_count: 0,
  total_admitted_voters_count: 0,
};

const votes: VotesCounts = {
  votes_candidates_count: 100,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 100,
};

const votesEmpty: VotesCounts = {
  votes_candidates_count: 0,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 0,
};

test.describe("Data entry", () => {
  createTestModel(machine)
    .getSimplePaths()
    .forEach((path) => {
      // eslint-disable-next-line playwright/valid-title
      test(path.description, async ({ page, pollingStation }) => {
        const pollingStationChoicePage = new PollingStationChoicePage(page);
        const recountedPage = new RecountedPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        const differencesPage = new DifferencesPage(page);
        const abortModal = new AbortInputModal(page);

        await page.goto(`/elections/${pollingStation.election_id}/data-entry`);

        await expect(pollingStationChoicePage.fieldset).toBeVisible();
        await pollingStationChoicePage.pollingStationNumber.fill(pollingStation.number.toString());
        await expect(pollingStationChoicePage.pollingStationFeedback).toContainText(pollingStation.name);
        await pollingStationChoicePage.clickStart();

        await expect(recountedPage.fieldset).toBeVisible();
        await recountedPage.no.check();
        await recountedPage.next.click();

        await path.test({
          states: {
            pollingStationsPageDiscarded: async () => {
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).toBeHidden();
            },
            pollingStationsPageEmptySaved: async () => {
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).toContainText(
                `${pollingStation.number} - ${pollingStation.name}`,
              );
            },
            pollingStationsPageFilledSaved: async () => {
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).toContainText(
                `${pollingStation.number} - ${pollingStation.name}`,
              );
            },
            pollingStationsPageChangedSaved: async () => {
              await expect(pollingStationChoicePage.fieldset).toBeVisible();
              await expect(pollingStationChoicePage.alertDataEntryInProgress).toContainText(
                `${pollingStation.number} - ${pollingStation.name}`,
              );
            },
            recountedPageEmpty: async () => {
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
            recountedPageCached: async () => {
              await expect(recountedPage.fieldset).toBeVisible();
              await expect(recountedPage.no).toBeChecked();
            },
            voterVotesPageCached: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters, votes });
            },
            voterVotesPageEmpty: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters: votersEmpty, votes: votesEmpty });
            },
            votersVotesPageFilled: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters, votes });
            },
            votersVotesPageSubmitted: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters, votes });
            },
            votersVotesPageChangedSubmitted: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters: votersChanged, votes });
            },
            votersVotesPageChangedFilled: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters: votersChanged, votes });
            },
            votersVotesPageAfterResumeSaved: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters, votes });
            },
            votersVotesPageAfterResumeChanged: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters: votersChanged, votes });
            },
            votersVotesPageAfterResumeEmpty: async () => {
              await expect(votersAndVotesPage.fieldset).toBeVisible();
              const fields = await votersAndVotesPage.getVotersAndVotesCounts();
              expect(fields).toStrictEqual({ voters: votersEmpty, votes: votesEmpty });
            },
            differencesPage: async () => {
              await expect(differencesPage.fieldset).toBeVisible();
            },
            abortInputModalFilled: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            abortInputModalEmpty: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            abortInputModalChanged: async () => {
              await expect(abortModal.heading).toBeVisible();
            },
            unsavedChangesModalChanged: async () => {
              await expect(recountedPage.unsavedChangesModal.heading).toBeVisible();
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
              // TODO: add to page object
              await page.getByRole("link", { name: "Test Location" }).click();
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
              // TODO: add to page object
              await pollingStationChoicePage.alertDataEntryInProgress
                .getByRole("link", { name: `${pollingStation.number} - ${pollingStation.name}` })
                .click();
            },
          },
        });
      });
    });
});
