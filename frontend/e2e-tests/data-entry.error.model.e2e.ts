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

const dataEntryMachineDefinition = {
  initial: "voterVotesPageEmpty",
  states: {
    pollingStationsPageErrorSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeError",
      },
    },
    pollingStationsPageChangedErrorSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeErrorChanged",
      },
    },
    pollingStationsPageDiscarded: {},
    recountedPageErrorSubmitted: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageErrorSubmitted",
      },
    },
    recountedPageChangedErrorSubmitted: {},
    recountedPageChangedErrorDiscarded: {},
    recountedPageFilledError: {},
    voterVotesPageEmpty: {
      on: {
        FILL_WITH_VALID_DATA: "votersVotesPageFilledValid",
        FILL_WITH_ERROR_DATA: "VotersVotesPageFilledError",
      },
    },
    votersVotesPageFilledValid: {
      on: {
        SUBMIT: "differencesPageValid",
      },
    },
    votersVotesPageValidSubmitted: {
      on: {
        CHANGE_TO_ERROR_DATA: "votersVotesPageChangedError",
      },
    },
    votersVotesPageChangedError: {
      on: {
        SUBMIT: "votersVotesPageChangedErrorSubmitted",
        CLICK_ABORT: "abortInputModalChangedErrorSubmitted",
        GO_TO_RECOUNTED_PAGE: "unsavedChangesModalChanged",
      },
    },
    VotersVotesPageFilledError: {
      on: {
        SUBMIT: "votersVotesPageErrorSubmitted",
        GO_TO_RECOUNTED_PAGE: "recountedPageFilledError",
      },
    },
    votersVotesPageErrorSubmitted: {
      on: {
        CORRECT_ERROR_DATA: "votersVotesPageCorrected",
        CLICK_ABORT: "abortInputModalErrorSubmitted",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalErrorSubmitted",
        GO_TO_RECOUNTED_PAGE: "recountedPageErrorSubmitted",
        // no GO_TO_DIFFERENCES_PAGE, because unreachable
      },
    },
    votersVotesPageChangedErrorSubmitted: {
      on: {
        CORRECT_ERROR_DATA: "votersVotesPageCorrected",
        CLICK_ABORT: "abortInputModalChangedErrorSubmitted",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalChangedErrorSubmitted",
        // no GO_TO_RECOUNTED_PAGE because too similar to same action on votersVotesPageErrorSubmitted
        GO_TO_DIFFERENCES_PAGE: "differencesPageError",
      },
    },
    votersVotesPageCorrected: {
      on: {
        SUBMIT: "differencesPageCorrected",
      },
    },
    votersVotesPageAfterResumeError: {},
    votersVotesPageAfterResumeErrorChanged: {},
    differencesPageValid: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageValidSubmitted",
      },
    },
    differencesPageCorrected: {},
    differencesPageError: {},
    abortInputModalErrorSubmitted: {
      on: {
        SAVE_INPUT: "pollingStationsPageErrorSaved",
        DISCARD_INPUT: "pollingStationsPageDiscarded",
      },
    },
    abortInputModalChangedErrorSubmitted: {
      on: {
        SAVE_INPUT: "pollingStationsPageChangedErrorSaved",
        DISCARD_INPUT: "pollingStationsPageDiscarded",
      },
    },
    unsavedChangesModalChanged: {
      on: {
        SAVE_UNSUBMITTED_CHANGES: "recountedPageChangedErrorSubmitted",
        DISCARD_UNSUBMITTED_CHANGES: "recountedPageChangedErrorDiscarded",
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
          pollingStationsPageErrorSaved: async () => {
            await expect(pollingStationChoicePage.fieldset).toBeVisible();
            await expect(pollingStationChoicePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageChangedErrorSaved: async () => {
            await expect(pollingStationChoicePage.fieldset).toBeVisible();
            await expect(pollingStationChoicePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageDiscarded: async () => {
            await expect(pollingStationChoicePage.fieldset).toBeVisible();
            await expect(pollingStationChoicePage.alertDataEntryInProgress).toBeHidden();
          },
        };
        const PollingStationsPageEvents = {
          RESUME_DATA_ENTRY: async () => {
            await pollingStationChoicePage.clickDataEntryInProgress(pollingStation.number, pollingStation.name);
          },
        };
        const recountedPageStates = {
          recountedPageErrorSubmitted: async () => {
            await expect(recountedPage.fieldset).toBeVisible();
            await expect(recountedPage.no).toBeChecked();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een fout");
          },
          recountedPageChangedErrorSubmitted: async () => {
            await expect(recountedPage.fieldset).toBeVisible();
            await expect(recountedPage.no).toBeChecked();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een fout");
          },
          recountedPageFilledError: async () => {
            await expect(recountedPage.fieldset).toBeVisible();
            await expect(recountedPage.no).toBeChecked();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("nog niet afgerond");
          },
          recountedPageChangedErrorDiscarded: async () => {
            await expect(recountedPage.fieldset).toBeVisible();
            await expect(recountedPage.no).toBeChecked();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
        };
        const recountedPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await recountedPage.navPanel.votersAndVotes.click();
          },
        };
        const votersVotesPageStates = {
          voterVotesPageEmpty: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersEmpty, votes: votesEmpty });
          },
          votersVotesPageFilledValid: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes });
          },
          votersVotesPageValidSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes });
          },
          votersVotesPageChangedError: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
          },
          VotersVotesPageFilledError: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
          },
          votersVotesPageErrorSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
            await expect(votersAndVotesPage.error).toContainText(
              "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.",
            );
          },
          votersVotesPageChangedErrorSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
            await expect(votersAndVotesPage.error).toContainText(
              "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.",
            );
          },
          votersVotesPageCorrected: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersChanged, votes });
          },
          votersVotesPageAfterResumeError: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
            await expect(votersAndVotesPage.error).toBeHidden();
          },
          votersVotesPageAfterResumeErrorChanged: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
            await expect(votersAndVotesPage.error).toContainText(
              "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.",
            );
          },
          unsavedChangesModalChanged: async () => {
            await expect(votersAndVotesPage.unsavedChangesModal.heading).toBeVisible();
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
          SUBMIT: async () => {
            await votersAndVotesPage.next.click();
          },
          CORRECT_ERROR_DATA: async () => {
            await votersAndVotesPage.inputVotersCounts(votersChanged);
          },
          CHANGE_TO_ERROR_DATA: async () => {
            await votersAndVotesPage.inputVotersCounts(votersError);
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
          GO_TO_DIFFERENCES_PAGE: async () => {
            await votersAndVotesPage.navPanel.differences.click();
          },
          SAVE_UNSUBMITTED_CHANGES: async () => {
            await votersAndVotesPage.unsavedChangesModal.saveInput.click();
          },
          DISCARD_UNSUBMITTED_CHANGES: async () => {
            await votersAndVotesPage.unsavedChangesModal.discardInput.click();
          },
        };

        const differencesPageStates = {
          differencesPageValid: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageCorrected: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageError: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een fout");
          },
        };
        const differencesPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await differencesPage.navPanel.votersAndVotes.click();
          },
        };

        const abortInputModalStates = {
          abortInputModalErrorSubmitted: async () => {
            await expect(abortModal.heading).toBeVisible();
          },
          abortInputModalChangedErrorSubmitted: async () => {
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
