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
import { getStatesAndEventsFromMachineDefinition, getStatesAndEventsFromTest } from "./xstate-helpers";

/*
Not covered in the model:
- errors
  - fill latest page with error data -> can't proceed, can go back
  - return to votersvotes and fill with error data -> can go forward
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

const dataEntryMachineDefinition = {
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
        FILL_WITH_ERROR_DATA: "VotersVotesPageError",
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
    VotersVotesPageError: {
      on: {
        SUBMIT: "votersVotesPageSubmittedError",
      },
    },
    votersVotesPageSubmitted: {
      on: {
        CHANGE_VALID_DATA: "votersVotesPageChangedFilled",
      },
    },
    votersVotesPageSubmittedError: {
      on: {
        CORRECT_ERROR_DATA: "votersVotesPageFilled",
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
};

const machine = createMachine(dataEntryMachineDefinition);
const { machineStates, machineEvents } = getStatesAndEventsFromMachineDefinition(dataEntryMachineDefinition);

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

const votersError: VotersCounts = {
  poll_card_count: 70,
  proxy_certificate_count: 30,
  voter_card_count: 0,
  total_admitted_voters_count: 90, // incorrect total
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

test.describe("Data entry model test", () => {
  createTestModel(machine)
    .getSimplePaths()
    .forEach((path) => {
      // eslint-disable-next-line playwright/valid-title
      test(path.description, async ({ page, pollingStation, election }) => {
        const pollingStationChoicePage = new PollingStationChoicePage(page);
        const recountedPage = new RecountedPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        const differencesPage = new DifferencesPage(page);
        const abortModal = new AbortInputModal(page);

        const pollingStationsPageStates = {
          pollingStationsPageDiscarded: async () => {
            await expect(pollingStationChoicePage.fieldset).toBeVisible();
            await expect(pollingStationChoicePage.alertDataEntryInProgress).toBeHidden();
          },
          pollingStationsPageEmptySaved: async () => {
            await expect(pollingStationChoicePage.fieldset).toBeVisible();
            await expect(pollingStationChoicePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageFilledSaved: async () => {
            await expect(pollingStationChoicePage.fieldset).toBeVisible();
            await expect(pollingStationChoicePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageChangedSaved: async () => {
            await expect(pollingStationChoicePage.fieldset).toBeVisible();
            await expect(pollingStationChoicePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
        };

        const PollingStationsPageEvents = {
          RESUME_DATA_ENTRY: async () => {
            await pollingStationChoicePage.clickDataEntryInProgress(pollingStation.number, pollingStation.name);
          },
        };

        const recountedPageStates = {
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
          unsavedChangesModalChanged: async () => {
            await expect(recountedPage.unsavedChangesModal.heading).toBeVisible();
          },
        };

        const recountedPageEvents = {
          SAVE_UNSUBMITTED_CHANGES: async () => {
            await recountedPage.unsavedChangesModal.saveInput.click();
          },
          DISCARD_UNSUBMITTED_CHANGES: async () => {
            await recountedPage.unsavedChangesModal.discardInput.click();
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
          VotersVotesPageError: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
          },
          votersVotesPageSubmittedError: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.error).toContainText(
              "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.",
            );
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
          FILL_WITH_ERROR_DATA: async () => {
            await votersAndVotesPage.inputVotersCounts(votersError);
            await votersAndVotesPage.inputVotesCounts(votes);
          },
          CORRECT_ERROR_DATA: async () => {
            await votersAndVotesPage.inputVotersCounts(voters);
          },
          CHANGE_VALID_DATA: async () => {
            await votersAndVotesPage.inputVotersCounts(votersChanged);
          },
          CLICK_ABORT: async () => {
            await votersAndVotesPage.abortInput.click();
          },
          NAV_TO_POLLING_STATION_PAGE: async () => {
            await votersAndVotesPage.clickElectionInNavBar(election.election.location, election.election.name);
          },
          GO_TO_RECOUNTED_PAGE: async () => {
            await votersAndVotesPage.navPanel.recounted.click();
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
            await differencesPage.navPanel.votersAndVotes.click();
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
            recountedPageStates,
            votersVotesPageStates,
            differencesPageStates,
            abortInputModalStates,
          ],
          [
            PollingStationsPageEvents,
            recountedPageEvents,
            votersAndVotesPageEvents,
            differencesPageEvents,
            abortInputModalEvents,
          ],
        );
        expect(new Set(states)).toEqual(new Set(machineStates));
        expect(new Set(events)).toEqual(new Set(machineEvents));

        await page.goto(`/elections/${pollingStation.election_id}/data-entry`);
        await pollingStationChoicePage.selectPollingStationAndClickStart(pollingStation.number);
        await recountedPage.checkNoAndClickNext();

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
            ...recountedPageStates,
            ...votersVotesPageStates,
            ...differencesPageStates,
            ...abortInputModalStates,
          } satisfies Record<MachineStateKey, () => void>,
          events: {
            ...votersAndVotesPageEvents,
            ...recountedPageEvents,
            ...differencesPageEvents,
            ...abortInputModalEvents,
            ...PollingStationsPageEvents,
          } satisfies Record<MachineEventKey, () => void>,
        });
      });
    });
});
