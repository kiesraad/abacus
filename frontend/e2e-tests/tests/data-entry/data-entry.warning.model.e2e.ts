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
    pollingStationsPageWarningSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeWarning",
      },
    },
    pollingStationsPageDiscarded: {},
    pollingStationsPageChangedToWarningSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeChangedToWarning",
      },
    },
    extraInvestigationPageEmpty: {
      on: {
        FILL_EXTRA_INVESTIGATION: "extraInvestigationPageFilled",
      },
    },
    extraInvestigationPageFilled: {
      on: {
        SUBMIT: "voterVotesPageEmpty",
      },
    },
    voterVotesPageEmpty: {
      on: {
        FILL_WITH_WARNING: "votersVotesPageWarningFilled",
        FILL_VALID_DATA_AND_SUBMIT: "differencesPageValidSubmitted",
      },
    },
    votersVotesPageWarningFilled: {
      on: {
        SUBMIT: "votersVotesPageWarningSubmitted",
      },
    },
    votersVotesPageWarningSubmitted: {
      on: {
        SUBMIT: "votersVotesPageWarningReminder",
        ACCEPT_WARNING: "voterVotesPageWarningAccepted",
        CORRECT_WARNING: "voterVotesPageWarningCorrected",
        CHANGE_TO_ERROR_AND_SUBMIT: "votersVotesPageError",
        CLICK_ABORT: "abortInputModalWarning",
        NAV_TO_POLLING_STATION_PAGE: "abortInputModalWarning",
      },
    },
    voterVotesPageWarningAccepted: {
      on: {
        SUBMIT: "differencesPageWarningAccepted",
        UNACCEPT_WARNING: "votersVotesPageWarningUnaccepted",
      },
    },
    votersVotesPageWarningUnaccepted: {
      on: {
        SUBMIT: "votersVotesPageWarningReminder",
      },
    },
    voterVotesPageWarningCorrected: {
      on: {
        SUBMIT: "differencesPageCorrected",
      },
    },
    votersVotesPageValidSubmitted: {
      on: {
        CHANGE_TO_WARNING: "votersVotesPageChangedToWarning",
      },
    },
    votersVotesPageChangedToWarning: {
      on: {
        SUBMIT: "votersVotesPageChangedToWarningSubmitted",
      },
    },
    votersVotesPageChangedToWarningSubmitted: {
      on: {
        ABORT_AND_SAVE: "pollingStationsPageChangedToWarningSaved",
      },
    },
    votersVotesPageWarningReminder: {
      on: {
        ACCEPT_WARNING: "voterVotesPageWarningAccepted",
      },
    },
    votersVotesPageError: {},
    votersVotesPageAfterResumeWarning: {},
    votersVotesPageAfterResumeChangedToWarning: {},
    differencesPageWarningAccepted: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "voterVotesPageWarningAccepted",
      },
    },
    differencesPageValidSubmitted: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageValidSubmitted",
      },
    },
    differencesPageCorrected: {},
    abortInputModalWarning: {
      on: {
        SAVE_INPUT: "pollingStationsPageWarningSaved",
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

const votesWarning: VotesCounts = {
  votes_candidates_count: 65,
  blank_votes_count: 0,
  invalid_votes_count: 35,
  total_votes_cast_count: 100,
};

const votesValid: VotesCounts = {
  votes_candidates_count: 99,
  blank_votes_count: 1,
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

test.describe("Data entry model test - warnings", () => {
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
          pollingStationsPageWarningSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          pollingStationsPageChangedToWarningSaved: async () => {
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
          extraInvestigationPageFilled: async () => {
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
          votersVotesPageWarningFilled: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toBeHidden();
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
          },
          votersVotesPageChangedToWarning: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toBeHidden();
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
          },
          votersVotesPageWarningSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
          },
          votersVotesPageChangedToWarningSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
          },
          voterVotesPageWarningAccepted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeChecked();
          },
          votersVotesPageWarningUnaccepted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
          },
          votersVotesPageWarningReminder: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
            await expect(votersAndVotesPage.acceptErrorsAndWarningsReminder).toBeVisible();
          },
          voterVotesPageWarningCorrected: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesValid });
          },
          votersVotesPageValidSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toBeHidden();
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesValid });
          },
          votersVotesPageError: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.error).toBeVisible();

            // With the current mockData a warning is also triggered.
            //await expect(votersAndVotesPage.warning).toBeHidden();

            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes: votesWarning });
          },
          votersVotesPageAfterResumeWarning: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toBeHidden();
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
          },
          votersVotesPageAfterResumeChangedToWarning: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
          },
          abortInputModalWarning: async () => {
            await expect(abortModal.heading).toBeVisible();
          },
        };

        const votersAndVotesPageEvents = {
          FILL_WITH_WARNING: async () => {
            await votersAndVotesPage.inputVotersCounts(voters);
            await votersAndVotesPage.inputVotesCounts(votesWarning);
          },
          CHANGE_TO_WARNING: async () => {
            await votersAndVotesPage.inputVotesCounts(votesWarning);
          },
          FILL_VALID_DATA_AND_SUBMIT: async () => {
            await votersAndVotesPage.inputVotersCounts(voters);
            await votersAndVotesPage.inputVotesCounts(votesValid);
            await votersAndVotesPage.next.click();
          },
          SUBMIT: async () => {
            await votersAndVotesPage.next.click();
          },
          ACCEPT_WARNING: async () => {
            await votersAndVotesPage.acceptErrorsAndWarnings.check();
          },
          CORRECT_WARNING: async () => {
            await votersAndVotesPage.inputVotesCounts(votesValid);
            // Tab press needed for page to register change after Playwright's fill()
            await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");
          },
          UNACCEPT_WARNING: async () => {
            await votersAndVotesPage.acceptErrorsAndWarnings.uncheck();
          },
          CHANGE_TO_ERROR_AND_SUBMIT: async () => {
            await votersAndVotesPage.inputVotersCounts(votersError);
            // Tab press needed for page to register change after Playwright's fill()
            await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");
            await votersAndVotesPage.next.click();
          },
          CLICK_ABORT: async () => {
            await votersAndVotesPage.abortInput.click();
          },
          ABORT_AND_SAVE: async () => {
            await votersAndVotesPage.abortInput.click();
            await abortModal.saveInput.click();
          },
          NAV_TO_POLLING_STATION_PAGE: async () => {
            await votersAndVotesPage.navBar.clickElection(election.election.location, election.election.name);
          },
        };

        const differencesPageStates = {
          differencesPageWarningAccepted: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageCorrected: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageValidSubmitted: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(differencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
        };
        const differencesPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await differencesPage.progressList.votersAndVotes.click();
          },
        };

        const abortInputModalStates = {
          pollingStationsPageWarningSaved: async () => {
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
        const abortInputModalEvents = {
          SAVE_INPUT: async () => {
            await abortModal.saveInput.click();
          },
          DISCARD_INPUT: async () => {
            await abortModal.discardInput.click();
          },
        };

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
