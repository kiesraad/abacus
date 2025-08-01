import { expect } from "@playwright/test";
import { createTestModel } from "@xstate/graph";
import { AbortInputModal } from "e2e-tests/page-objects/data_entry/AbortInputModalPgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import { ExtraInvestigationPage } from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { createMachine } from "xstate";

import { ExtraInvestigation, VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../../fixtures";
import {
  getStatesAndEventsFromMachineDefinition,
  getStatesAndEventsFromTest,
} from "../../helpers-utils/xstate-helpers";

/*
The names of the states in the machine keep track of two states:
1. the current page
2. the state of the data on the voters and votes page

So the state pollingStationsPageChangedSaved means that we're on the polling stations page, we have
changed the initial input on the voters and votes page, and we have saved it as part of navigating
to the polling stations page.
*/

const dataEntryMachineDefinition = {
  initial: "extraInvestigationPageEmpty",
  states: {
    pollingStationsPageErrorSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeError",
      },
    },
    pollingStationsPageChangedToErrorSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeErrorChanged",
      },
    },
    pollingStationsPageDiscarded: {},
    extraInvestigationPageEmpty: {
      on: {
        FILL_EXTRA_INVESTIGATION: "extraInvestigationPageFilledValid",
      },
    },
    extraInvestigationPageFilledValid: {
      on: {
        SUBMIT: "voterVotesPageEmpty",
      },
    },
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
        CHANGE_TO_ERROR_DATA: "votersVotesPageChangedToError",
      },
    },
    votersVotesPageChangedToError: {
      on: {
        SUBMIT: "votersVotesPageChangedToErrorSubmitted",
        CLICK_ABORT: "abortInputModalChangedToErrorSubmitted",
      },
    },
    VotersVotesPageFilledError: {
      on: {
        SUBMIT: "votersVotesPageErrorSubmitted",
      },
    },
    votersVotesPageErrorSubmitted: {
      on: {
        CORRECT_ERROR_DATA: "votersVotesPageCorrected",
        CHANGE_TO_WARNING_AND_SUBMIT: "votersVotesPageWarningSubmitted",
        CLICK_ABORT: "abortInputModalErrorSubmitted",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalErrorSubmitted",
        // no GO_TO_DIFFERENCES_PAGE, because unreachable
      },
    },
    votersVotesPageChangedToErrorSubmitted: {
      on: {
        CORRECT_ERROR_DATA: "votersVotesPageCorrected",
        CLICK_ABORT: "abortInputModalChangedToErrorSubmitted",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalChangedToErrorSubmitted",
        // no GO_TO_RECOUNTED_PAGE because too similar to same action on votersVotesPageErrorSubmitted
        GO_TO_DIFFERENCES_PAGE: "differencesPageError",
      },
    },
    votersVotesPageCorrected: {
      on: {
        SUBMIT: "differencesPageCorrected",
      },
    },
    votersVotesPageCorrectBackToValid: {
      on: {
        SUBMIT: "differencesPageCorrected",
      },
    },
    votersVotesPageWarningSubmitted: {},
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
    abortInputModalChangedToErrorSubmitted: {
      on: {
        SAVE_INPUT: "pollingStationsPageChangedToErrorSaved",
        DISCARD_INPUT: "pollingStationsPageDiscarded",
      },
    },
  },
};

const machine = createMachine(dataEntryMachineDefinition);
const { machineStates, machineEvents } = getStatesAndEventsFromMachineDefinition(dataEntryMachineDefinition);

const extraInvestigation: ExtraInvestigation = {
  extra_investigation_other_reason: {
    yes: false,
    no: true,
  },
  ballots_recounted_extra_investigation: {
    yes: false,
    no: true,
  },
};

const extraInvestigationEmpty: ExtraInvestigation = {
  extra_investigation_other_reason: {
    yes: false,
    no: false,
  },
  ballots_recounted_extra_investigation: {
    yes: false,
    no: false,
  },
};

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

const votersError: VotersCounts = {
  poll_card_count: 70,
  proxy_certificate_count: 30,
  total_admitted_voters_count: 90, // incorrect total
};

const votes: VotesCounts = {
  votes_candidates_count: 100,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 100,
};

const votesWarning: VotesCounts = {
  votes_candidates_count: 60,
  blank_votes_count: 40,
  invalid_votes_count: 0,
  total_votes_cast_count: 100,
};

const votesEmpty: VotesCounts = {
  votes_candidates_count: 0,
  blank_votes_count: 0,
  invalid_votes_count: 0,
  total_votes_cast_count: 0,
};

test.use({
  storageState: "e2e-tests/state/typist.json",
});

test.describe("Data entry model test - errors", () => {
  createTestModel(machine)
    .getSimplePaths()
    .forEach((path) => {
      // eslint-disable-next-line playwright/valid-title
      test(path.description, async ({ page, pollingStation, election }) => {
        const dataEntryHomePage = new DataEntryHomePage(page);
        const extraInvestigationPage = new ExtraInvestigationPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        const differencesPage = new DifferencesPage(page);
        const abortModal = new AbortInputModal(page);

        const pollingStationsPageStates = {
          pollingStationsPageErrorSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageChangedToErrorSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageDiscarded: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.alertDataEntryInProgress).toBeHidden();
          },
        };
        const PollingStationsPageEvents = {
          RESUME_DATA_ENTRY: async () => {
            await dataEntryHomePage.clickDataEntryInProgress(pollingStation.number, pollingStation.name);
          },
        };

        const extraInvestigationPageStates = {
          extraInvestigationPageEmpty: async () => {
            await expect(extraInvestigationPage.fieldset).toBeVisible();
            const extraInvestigationFields = await extraInvestigationPage.getExtraInvestigation();
            expect(extraInvestigationFields).toStrictEqual(extraInvestigationEmpty);
          },
          extraInvestigationPageFilledValid: async () => {
            await expect(extraInvestigationPage.fieldset).toBeVisible();
            const extraInvestigationFields = await extraInvestigationPage.getExtraInvestigation();
            expect(extraInvestigationFields).toStrictEqual(extraInvestigation);
          },
        };
        const extraInvestigationPageEvents = {
          FILL_EXTRA_INVESTIGATION: async () => {
            await extraInvestigationPage.inputExtraInvestigation(extraInvestigation);
          },
          SUBMIT: async () => {
            await extraInvestigationPage.next.click();
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
          votersVotesPageChangedToError: async () => {
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
              "Controleer toegelaten kiezersF.201De invoer bij A, B of D klopt niet.",
            );
          },
          votersVotesPageChangedToErrorSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes });
            await expect(votersAndVotesPage.error).toContainText(
              "Controleer toegelaten kiezersF.201De invoer bij A, B of D klopt niet.",
            );
          },
          votersVotesPageCorrected: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersChanged, votes });
          },
          votersVotesPageCorrectBackToValid: async () => {
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
              "Controleer toegelaten kiezersF.201De invoer bij A, B of D klopt niet.",
            );
          },
          votersVotesPageWarningSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.",
            );
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
          CHANGE_TO_WARNING_AND_SUBMIT: async () => {
            await votersAndVotesPage.inputVotersCounts(voters);
            await votersAndVotesPage.inputVotesCounts(votesWarning);
            await votersAndVotesPage.next.click();
          },
          CLICK_ABORT: async () => {
            await votersAndVotesPage.abortInput.click();
          },
          NAV_TO_POLLING_STATION_PAGE: async () => {
            await votersAndVotesPage.navBar.clickElection(election.election.location, election.election.name);
          },
          GO_TO_DIFFERENCES_PAGE: async () => {
            await votersAndVotesPage.progressList.differences.click();
          },
        };

        const differencesPageStates = {
          differencesPageValid: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageCorrected: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageError: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("bevat een fout");
          },
        };
        const differencesPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await differencesPage.progressList.votersAndVotes.click();
          },
        };

        const abortInputModalStates = {
          abortInputModalErrorSubmitted: async () => {
            await expect(abortModal.heading).toBeVisible();
          },
          abortInputModalChangedToErrorSubmitted: async () => {
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
            extraInvestigationPageStates,
            votersVotesPageStates,
            differencesPageStates,
            abortInputModalStates,
          ],
          [
            PollingStationsPageEvents,
            extraInvestigationPageEvents,
            votersAndVotesPageEvents,
            differencesPageEvents,
            abortInputModalEvents,
          ],
        );
        expect(new Set(states)).toEqual(new Set(machineStates));
        expect(new Set(events)).toEqual(new Set(machineEvents));

        await page.goto(`/elections/${pollingStation.election_id}/data-entry`);
        await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);

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
            ...extraInvestigationPageStates,
            ...votersVotesPageStates,
            ...differencesPageStates,
            ...abortInputModalStates,
          } satisfies Record<MachineStateKey, () => void>,
          events: {
            ...extraInvestigationPageEvents,
            ...votersAndVotesPageEvents,
            ...differencesPageEvents,
            ...abortInputModalEvents,
            ...PollingStationsPageEvents,
          } satisfies Record<MachineEventKey, () => void>,
        });
      });
    });
});
