import { expect } from "@playwright/test";
import { createTestModel } from "@xstate/graph";
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

import { VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../../fixtures";
import {
  getStatesAndEventsFromMachineDefinition,
  getStatesAndEventsFromTest,
} from "../../helpers-utils/xstate-helpers";

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

const dataEntryMachineDefinition = {
  initial: "voterVotesPageEmpty",
  states: {
    countingDifferencesPollingStationPageFilled: {
      on: {
        SUBMIT: "voterVotesPageEmpty",
      },
    },
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
      },
    },
    votersVotesPageFilled: {
      on: {
        SUBMIT: "differencesPage",
        CLICK_ABORT: "abortInputModalFilled",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalFilled",
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
  },
};

const machine = createMachine(dataEntryMachineDefinition);
const { machineStates, machineEvents } = getStatesAndEventsFromMachineDefinition(dataEntryMachineDefinition);

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
  storageState: "e2e-tests/state/typist.json",
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

        const pollingStationsPageStates = {
          pollingStationsPageDiscarded: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.alertDataEntryInProgress).toBeHidden();
          },
          pollingStationsPageEmptySaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageFilledSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageChangedSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
        };

        const PollingStationsPageEvents = {
          RESUME_DATA_ENTRY: async () => {
            await dataEntryHomePage.clickDataEntryInProgress(pollingStation.number, pollingStation.name);
          },
        };

        const countingDifferencesPollingStationPageStates = {
          countingDifferencesPollingStationPageFilled: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
          },
        };
        const countingDifferencesPollingStationPageEvents = {
          SUBMIT: async () => {
            await countingDifferencesPollingStationPage.next.click();
          },
        };

        const votersVotesPageStates = {
          voterVotesPageCached: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes });
          },
          voterVotesPageEmpty: async () => {
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
          NAV_TO_POLLING_STATION_PAGE: async () => {
            await navBar.clickElection(election.election.location, election.election.name);
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

        // check that events and states used by the machine are equal to
        // the events and states specified in the test
        const { states, events } = getStatesAndEventsFromTest(
          [
            pollingStationsPageStates,
            countingDifferencesPollingStationPageStates,
            votersVotesPageStates,
            differencesPageStates,
            abortInputModalStates,
          ],
          [
            PollingStationsPageEvents,
            countingDifferencesPollingStationPageEvents,
            votersAndVotesPageEvents,
            differencesPageEvents,
            abortInputModalEvents,
          ],
        );
        expect(new Set(states)).toEqual(new Set(machineStates));
        expect(new Set(events)).toEqual(new Set(machineEvents));

        type MachineStates = typeof dataEntryMachineDefinition.states;
        type MachineStateKey = keyof MachineStates;
        type MachineEventKey = {
          [StateKey in MachineStateKey]: MachineStates[StateKey] extends { on: Record<infer EventKey, string> }
            ? EventKey
            : never;
        }[MachineStateKey];

        await path.test({
          states: {
            ...pollingStationsPageStates,
            ...countingDifferencesPollingStationPageStates,
            ...votersVotesPageStates,
            ...differencesPageStates,
            ...abortInputModalStates,
          } satisfies Record<MachineStateKey, () => void>,
          events: {
            ...countingDifferencesPollingStationPageEvents,
            ...votersAndVotesPageEvents,
            ...differencesPageEvents,
            ...abortInputModalEvents,
            ...PollingStationsPageEvents,
          } satisfies Record<MachineEventKey, () => void>,
        });
      });
    });
});
