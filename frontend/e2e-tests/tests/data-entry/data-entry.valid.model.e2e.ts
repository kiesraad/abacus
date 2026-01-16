import { expect } from "@playwright/test";
import { createTestModel } from "@xstate/graph";
import {
  assertMachineAndImplementationMatches,
  typeCheckedMachineDefinition,
} from "e2e-tests/helpers-utils/xstate-helpers";
import { AbortInputModal } from "e2e-tests/page-objects/data_entry/AbortInputModalPgObj";
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
import { TypistNavBar } from "e2e-tests/page-objects/nav_bar/TypistNavBarPgObj";
import { createMachine } from "xstate";
import type { VotersCounts, VotesCounts } from "@/types/generated/openapi";
import { test } from "../../fixtures";

/*
This model-based e2e test covers the state changes from one section (the voters and votes page) that do not trigger any warnings or errors.
It does not progress through the whole data entry flow.

The names of the states in the machine keep track of two states:
1. the current page
2. the state of the data on the voters and votes page

So the state dataEntryHomePageChangedSaved means that we're on the data entry homepage, we have
changed the initial input on the voters and votes page, and we have saved it as part of navigating
to the data entry homepage.
*/

const dataEntryMachineDefinition = typeCheckedMachineDefinition({
  initial: "votersVotesPageEmpty",
  states: {
    dataEntryHomePageDiscarded: {},
    dataEntryHomePageEmptySaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeEmpty",
      },
    },
    dataEntryHomePageFilledSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeSaved",
      },
    },
    dataEntryHomePageChangedSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeChanged",
      },
    },
    countingDifferencesPollingStationPageEmpty: {},
    countingDifferencesPollingStationPageSaved: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageChangedSubmitted",
      },
    },
    countingDifferencesPollingStationPageDiscarded: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageSubmitted",
      },
    },
    countingDifferencesPollingStationPageCached: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageCached",
      },
    },
    votersVotesPageCached: {
      on: {
        SUBMIT: "differencesPage",
      },
    },
    votersVotesPageEmpty: {
      on: {
        FILL_WITH_VALID_DATA: "votersVotesPageFilled",
        CLICK_ABORT: "abortInputModalEmpty",
        NAV_TO_HOME_PAGE: "abortInputModalEmpty",
        GO_TO_PREVIOUS_PAGE: "countingDifferencesPollingStationPageEmpty",
      },
    },
    votersVotesPageFilled: {
      on: {
        SUBMIT: "differencesPage",
        CLICK_ABORT: "abortInputModalFilled",
        NAV_TO_HOME_PAGE: "abortInputModalFilled",
        GO_TO_PREVIOUS_PAGE: "countingDifferencesPollingStationPageCached",
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
        NAV_TO_HOME_PAGE: "abortInputModalChanged",
        GO_TO_PREVIOUS_PAGE: "unsavedChangesModalChanged",
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
        SAVE_INPUT: "dataEntryHomePageFilledSaved",
        DISCARD_INPUT: "dataEntryHomePageDiscarded",
      },
    },
    abortInputModalEmpty: {
      on: {
        SAVE_INPUT: "dataEntryHomePageEmptySaved",
        DISCARD_INPUT: "dataEntryHomePageDiscarded",
      },
    },
    abortInputModalChanged: {
      on: {
        SAVE_INPUT: "dataEntryHomePageChangedSaved",
        DISCARD_INPUT: "dataEntryHomePageDiscarded",
      },
    },
    unsavedChangesModalChanged: {
      on: {
        SAVE_UNSUBMITTED_CHANGES: "countingDifferencesPollingStationPageSaved",
        DISCARD_UNSUBMITTED_CHANGES: "countingDifferencesPollingStationPageDiscarded",
      },
    },
  },
} as const);

const machine = createMachine(dataEntryMachineDefinition);

const voters: VotersCounts = {
  poll_card_count: 90,
  proxy_certificate_count: 10,
  total_admitted_voters_count: 100,
};

const votersChanged: VotersCounts = {
  poll_card_count: 80,
  proxy_certificate_count: 20,
  total_admitted_voters_count: 100,
};

const votersEmpty: VotersCounts = {
  poll_card_count: 0,
  proxy_certificate_count: 0,
  total_admitted_voters_count: 0,
};

const votes: VotesCounts = {
  political_group_total_votes: [
    { number: 1, total: 50 },
    { number: 2, total: 50 },
    { number: 3, total: 0 },
  ],
  total_votes_candidates_count: 100,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 100,
};

const votesEmpty: VotesCounts = {
  political_group_total_votes: [
    { number: 1, total: 0 },
    { number: 2, total: 0 },
    { number: 3, total: 0 },
  ],
  total_votes_candidates_count: 0,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 0,
};

test.use({
  storageState: "e2e-tests/state/typist1.json",
});

test.describe("Data entry model test - valid data", () => {
  createTestModel(machine)
    .getSimplePaths()
    .forEach((path) => {
      // eslint-disable-next-line playwright/valid-title
      test(path.description, async ({ page, pollingStation, election }) => {
        const dataEntryHomePage = new DataEntryHomePage(page);
        const extraInvestigationPage = new ExtraInvestigationPage(page);
        const countingDifferencesPollingStationPage = new CountingDifferencesPollingStationPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        const differencesPage = new DifferencesPage(page);
        const abortModal = new AbortInputModal(page);
        const navBar = new TypistNavBar(page);

        await page.goto(`/elections/${pollingStation.election_id}/data-entry`);
        await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);
        await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);
        await countingDifferencesPollingStationPage.fillAndClickNext(noDifferences);

        const dataEntryHomePageStates = {
          dataEntryHomePageDiscarded: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.alertDataEntryInProgress).toBeHidden();
          },
          dataEntryHomePageEmptySaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          dataEntryHomePageFilledSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          dataEntryHomePageChangedSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
        };

        const dataEntryHomePageEvents = {
          RESUME_DATA_ENTRY: async () => {
            await dataEntryHomePage.clickDataEntryInProgress(pollingStation.number, pollingStation.name);
          },
        };

        const countingDifferencesPollingStationPageStates = {
          countingDifferencesPollingStationPageEmpty: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
          },
          countingDifferencesPollingStationPageSaved: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
          },
          countingDifferencesPollingStationPageDiscarded: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
          },
          countingDifferencesPollingStationPageCached: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
          },
          unsavedChangesModalChanged: async () => {
            await expect(countingDifferencesPollingStationPage.unsavedChangesModal.heading).toBeVisible();
          },
        };

        const countingDifferencesPollingStationPageEvents = {
          SAVE_UNSUBMITTED_CHANGES: async () => {
            await countingDifferencesPollingStationPage.unsavedChangesModal.saveInput.click();
          },
          DISCARD_UNSUBMITTED_CHANGES: async () => {
            await countingDifferencesPollingStationPage.unsavedChangesModal.discardInput.click();
          },
        };

        const votersVotesPageStates = {
          votersVotesPageCached: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes });
          },
          votersVotesPageEmpty: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersEmpty, votes: votesEmpty });
          },
          votersVotesPageFilled: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes });
          },
          votersVotesPageSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes });
          },
          votersVotesPageChangedSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersChanged, votes });
          },
          votersVotesPageChangedFilled: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersChanged, votes });
          },
          votersVotesPageAfterResumeSaved: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes });
          },
          votersVotesPageAfterResumeChanged: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersChanged, votes });
          },
          votersVotesPageAfterResumeEmpty: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersEmpty, votes: votesEmpty });
          },
        };

        const votersAndVotesPageEvents = {
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
          NAV_TO_HOME_PAGE: async () => {
            await navBar.clickElection(election.election.location, election.election.name);
          },
          GO_TO_PREVIOUS_PAGE: async () => {
            await votersAndVotesPage.progressList.countingDifferencesPollingStation.click();
          },
          SUBMIT: async () => {
            await votersAndVotesPage.next.click();
          },
        };

        const differencesPageStates = {
          differencesPage: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
          },
        };

        const differencesPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await differencesPage.progressList.votersAndVotes.click();
          },
        };

        const abortInputModalStates = {
          abortInputModalFilled: async () => {
            await expect(abortModal.heading).toBeVisible();
          },
          abortInputModalEmpty: async () => {
            await expect(abortModal.heading).toBeVisible();
          },
          abortInputModalChanged: async () => {
            await expect(abortModal.heading).toBeVisible();
          },
        };
        const abortInputModalEvents = {
          SAVE_INPUT: async () => {
            await abortModal.saveInput.click();
          },
          DISCARD_INPUT: async () => {
            await abortModal.discardInput.click();
          },
        };

        type MachineStates = typeof dataEntryMachineDefinition.states;
        type MachineStateKey = keyof MachineStates;
        type MachineEventKey = {
          [StateKey in MachineStateKey]: MachineStates[StateKey] extends { on: Record<infer EventKey, string> }
            ? EventKey
            : never;
        }[MachineStateKey];

        const states: Record<MachineStateKey, () => Promise<void>> = {
          ...dataEntryHomePageStates,
          ...countingDifferencesPollingStationPageStates,
          ...votersVotesPageStates,
          ...differencesPageStates,
          ...abortInputModalStates,
        };

        const events: Record<MachineEventKey, () => Promise<void>> = {
          ...dataEntryHomePageEvents,
          ...countingDifferencesPollingStationPageEvents,
          ...votersAndVotesPageEvents,
          ...differencesPageEvents,
          ...abortInputModalEvents,
        };

        assertMachineAndImplementationMatches(dataEntryMachineDefinition, states, events);

        await path.test({ states, events });
      });
    });
});
