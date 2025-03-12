// transitions
// empty -> warning
// valid submitted -> warning
// error -> warning
// warning -> accept
// warning -> correct
// warning -> error
// warning -> other warning
// warning -> submit! -> warning
// nav, abort, draft
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
  // TODOs
  // - resume data entry on not-latest page with warning -> warning is shown; same works for errors
  // - change warning to different warning
  // - edit when warning -> warning disppears !check if covered, make explicit in test

  initial: "voterVotesPageEmpty",
  states: {
    recountedPageWarning: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageWarning",
      },
    },
    voterVotesPageEmpty: {
      on: {
        FILL_WITH_WARNING: "votersVotesPageWarningFilled",
        FILL_VALID_DATA_AND_SUBMIT: "differencesPageValid",
      },
    },
    votersVotesPageWarningFilled: {
      on: {
        SUBMIT: "votersVotesPageWarning",
      },
    },
    votersVotesPageWarning: {
      on: {
        SUBMIT: "votersVotesPageWarningReminder",
        ACCEPT_WARNING: "voterVotesPageWarningAccepted",
        CORRECT_WARNING: "voterVotesPageWarningCorrected",
        CHANGE_TO_ERROR_AND_SUBMIT: "votersVotesPageError",
        GO_TO_RECOUNTED_PAGE: "recountedPageWarning",
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
    votersVotesPageValid: {
      on: {
        FILL_WITH_WARNING: "votersVotesPageValidToWarning",
      },
    },
    votersVotesPageValidToWarning: {
      on: {
        SUBMIT: "votersVotesPageWarningEnd",
      },
    },
    votersVotesPageWarningEnd: {},
    abortInputModalWarning: {
      on: {
        SAVE_INPUT: "pollingStationsPageWarningSaved",
        DISCARD_INPUT: "pollingStationsPageDiscarded",
      },
    },
    pollingStationsPageWarningSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeWarning",
      },
    },
    pollingStationsPageDiscarded: {},
    differencesPageWarningAccepted: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "voterVotesPageWarningAccepted",
      },
    },
    differencesPageValid: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageValid",
      },
    },
    differencesPageCorrected: {}, // return and change to warning? or valid then warning?
    votersVotesPageWarningReminder: {
      on: {
        ACCEPT_WARNING: "voterVotesPageWarningAccepted",
      },
    },
    votersVotesPageError: {},
    votersVotesPageAfterResumeWarning: {},
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
        const pollingStationChoicePage = new PollingStationChoicePage(page);
        const recountedPage = new RecountedPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        const differencesPage = new DifferencesPage(page);
        const abortModal = new AbortInputModal(page);

        const pollingStationsPageStates = {
          pollingStationsPageWarningSaved: async () => {
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
          recountedPageWarning: async () => {
            await expect(recountedPage.fieldset).toBeVisible();
            await expect(recountedPage.no).toBeChecked();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("bevat een waarschuwing");
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
          votersVotesPageWarningFilled: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
          },
          votersVotesPageValidToWarning: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
          },
          votersVotesPageWarning: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptWarnings).toBeVisible();
          },
          votersVotesPageWarningEnd: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptWarnings).toBeVisible();
          },
          voterVotesPageWarningAccepted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptWarnings).toBeVisible();
            await expect(votersAndVotesPage.acceptWarnings).toBeChecked();
          },
          votersVotesPageWarningUnaccepted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptWarnings).toBeVisible();
            await expect(votersAndVotesPage.acceptWarnings).not.toBeChecked();
          },
          votersVotesPageWarningReminder: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptWarnings).toBeVisible();
            await expect(votersAndVotesPage.acceptWarningsReminder).toHaveText(
              "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.",
            );
          },
          voterVotesPageWarningCorrected: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesValid });
          },
          votersVotesPageValid: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toBeHidden();
            await expect(votersAndVotesPage.acceptWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesValid });
          },
          votersVotesPageError: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.error).toBeVisible();
            await expect(votersAndVotesPage.warning).toBeHidden();
            await expect(votersAndVotesPage.acceptWarnings).toBeHidden();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters: votersError, votes: votesWarning });
          },
          votersVotesPageAfterResumeWarning: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toBeHidden();
            await expect(votersAndVotesPage.acceptWarnings).toBeHidden();
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
          FILL_VALID_DATA_AND_SUBMIT: async () => {
            await votersAndVotesPage.inputVotersCounts(voters);
            await votersAndVotesPage.inputVotesCounts(votesValid);
            await votersAndVotesPage.next.click();
          },
          SUBMIT: async () => {
            await votersAndVotesPage.next.click();
          },
          ACCEPT_WARNING: async () => {
            await votersAndVotesPage.acceptWarnings.check();
          },
          CORRECT_WARNING: async () => {
            await votersAndVotesPage.inputVotesCounts(votesValid);
            // Tab press needed for page to register change after Playwright's fill()
            await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");
          },
          UNACCEPT_WARNING: async () => {
            await votersAndVotesPage.acceptWarnings.uncheck();
          },
          CHANGE_TO_ERROR_AND_SUBMIT: async () => {
            await votersAndVotesPage.inputVotersCounts(votersError);
            // Tab press needed for page to register change after Playwright's fill()
            await votersAndVotesPage.totalAdmittedVotersCount.press("Tab");
            await votersAndVotesPage.next.click();
          },
          GO_TO_RECOUNTED_PAGE: async () => {
            await votersAndVotesPage.navPanel.recounted.click();
          },
          CLICK_ABORT: async () => {
            await votersAndVotesPage.abortInput.click();
          },
          NAV_TO_POLLING_STATION_PAGE: async () => {
            await votersAndVotesPage.clickElectionInNavBar(election.election.location, election.election.name);
          },
        };

        const differencesPageStates = {
          differencesPageWarningAccepted: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageCorrected: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
          differencesPageValid: async () => {
            await expect(differencesPage.fieldset).toBeVisible();
            await expect(recountedPage.navPanel.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
        };
        const differencesPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await differencesPage.navPanel.votersAndVotes.click();
          },
        };

        const abortInputModalStates = {
          pollingStationsPageWarningSaved: async () => {
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
