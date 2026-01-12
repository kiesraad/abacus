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

import type { VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { test } from "../../fixtures";
import {
  assertMachineAndImplementationMatches,
  typeCheckedMachineDefinition,
} from "../../helpers-utils/xstate-helpers";

/*
This model-based e2e test covers the state changes from one section (the voters and votes page) that trigger warnings.
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
    dataEntryHomePageWarningSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeWarning",
      },
    },
    dataEntryHomePageDiscarded: {},
    dataEntryHomePageChangedToWarningSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeChangedToWarning",
      },
    },
    countingDifferencesPollingStationPageWarningSubmitted: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageWarningSubmitted",
      },
    },
    countingDifferencesPollingStationPageChangedToWarningSubmitted: {},
    countingDifferencesPollingStationPageChangedToWarningDiscarded: {},
    votersVotesPageEmpty: {
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
        ACCEPT_WARNING: "votersVotesPageWarningAccepted",
        CORRECT_WARNING: "votersVotesPageWarningCorrected",
        CHANGE_TO_ERROR_AND_SUBMIT: "votersVotesPageError",
        GO_TO_PREVIOUS_PAGE: "countingDifferencesPollingStationPageWarningSubmitted",
        CLICK_ABORT: "abortInputModalWarning",
        NAV_TO_HOME_PAGE: "abortInputModalWarning",
      },
    },
    votersVotesPageWarningAccepted: {
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
    votersVotesPageWarningCorrected: {
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
        GO_TO_PREVIOUS_PAGE: "unsavedChangesModalChangedToWarning",
      },
    },
    votersVotesPageChangedToWarningSubmitted: {
      on: {
        ABORT_AND_SAVE: "dataEntryHomePageChangedToWarningSaved",
      },
    },
    votersVotesPageWarningReminder: {
      on: {
        ACCEPT_WARNING: "votersVotesPageWarningAccepted",
      },
    },
    votersVotesPageError: {},
    votersVotesPageAfterResumeWarning: {},
    votersVotesPageAfterResumeChangedToWarning: {},
    unsavedChangesModalChangedToWarning: {
      on: {
        SAVE_UNSUBMITTED_CHANGES: "countingDifferencesPollingStationPageChangedToWarningSubmitted",
        DISCARD_UNSUBMITTED_CHANGES: "countingDifferencesPollingStationPageChangedToWarningDiscarded",
      },
    },
    differencesPageWarningAccepted: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageWarningAccepted",
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
        SAVE_INPUT: "dataEntryHomePageWarningSaved",
        DISCARD_INPUT: "dataEntryHomePageDiscarded",
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
  political_group_total_votes: [
    { number: 1, total: 50 },
    { number: 2, total: 15 },
    { number: 3, total: 0 },
  ],
  total_votes_candidates_count: 65,
  blank_votes_count: 0,
  invalid_votes_count: 35,
  total_votes_cast_count: 100,
};

const votesValid: VotesCounts = {
  political_group_total_votes: [
    { number: 1, total: 55 },
    { number: 2, total: 44 },
    { number: 3, total: 0 },
  ],
  total_votes_candidates_count: 99,
  blank_votes_count: 1,
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

test.describe("Data entry model test - warnings", () => {
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
          dataEntryHomePageWarningSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          dataEntryHomePageChangedToWarningSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          dataEntryHomePageDiscarded: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.alertDataEntryInProgress).toBeHidden();
          },
        };

        const dataEntryHomePageEvents = {
          RESUME_DATA_ENTRY: async () => {
            await dataEntryHomePage.clickDataEntryInProgress(pollingStation.number, pollingStation.name);
          },
        };

        const countingDifferencesPollingStationPageStates = {
          countingDifferencesPollingStationPageWarningSubmitted: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();

            expect(countingDifferencesFields).toStrictEqual(noDifferences);
            await expect(countingDifferencesPollingStationPage.progressList.votersAndVotesIcon).toHaveAccessibleName(
              "bevat een waarschuwing",
            );
          },
          countingDifferencesPollingStationPageChangedToWarningSubmitted: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();

            expect(countingDifferencesFields).toStrictEqual(noDifferences);
            await expect(countingDifferencesPollingStationPage.progressList.votersAndVotesIcon).toHaveAccessibleName(
              "bevat een waarschuwing",
            );
          },
          countingDifferencesPollingStationPageChangedToWarningDiscarded: async () => {
            await expect(countingDifferencesPollingStationPage.fieldset).toBeVisible();
            const countingDifferencesFields =
              await countingDifferencesPollingStationPage.getCountingDifferencesPollingStation();

            expect(countingDifferencesFields).toStrictEqual(noDifferences);
            await expect(countingDifferencesPollingStationPage.progressList.votersAndVotesIcon).toHaveAccessibleName(
              "opgeslagen",
            );
          },
        };

        const countingDifferencesPollingStationPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await countingDifferencesPollingStationPage.progressList.votersAndVotes.click();
          },
        };

        const votersVotesPageStates = {
          votersVotesPageEmpty: async () => {
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
            await expect(votersAndVotesPage.warning).toContainText("Controleer GW.202");
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
          },
          votersVotesPageChangedToWarningSubmitted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText("Controleer GW.202");
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
          },
          votersVotesPageWarningAccepted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText("Controleer GW.202");
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).toBeChecked();
          },
          votersVotesPageWarningUnaccepted: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText("Controleer GW.202");
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
          },
          votersVotesPageWarningReminder: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText("Controleer GW.202");
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
            await expect(votersAndVotesPage.acceptErrorsAndWarningsReminder).toBeVisible();
          },
          votersVotesPageWarningCorrected: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText("Controleer GW.202");
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
            await expect(votersAndVotesPage.warning).toContainText("Controleer GW.202");
            await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
            const votersVotesFields = await votersAndVotesPage.getVotersAndVotesCounts();
            expect(votersVotesFields).toStrictEqual({ voters, votes: votesWarning });
          },
          abortInputModalWarning: async () => {
            await expect(abortModal.heading).toBeVisible();
          },
          unsavedChangesModalChangedToWarning: async () => {
            await expect(votersAndVotesPage.unsavedChangesModal.heading).toBeVisible();
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
          GO_TO_PREVIOUS_PAGE: async () => {
            await votersAndVotesPage.progressList.countingDifferencesPollingStation.click();
          },
          CLICK_ABORT: async () => {
            await votersAndVotesPage.abortInput.click();
          },
          ABORT_AND_SAVE: async () => {
            await votersAndVotesPage.abortInput.click();
            await abortModal.saveInput.click();
          },
          NAV_TO_HOME_PAGE: async () => {
            await navBar.clickElection(election.election.location, election.election.name);
          },
          SAVE_UNSUBMITTED_CHANGES: async () => {
            await votersAndVotesPage.unsavedChangesModal.saveInput.click();
          },
          DISCARD_UNSUBMITTED_CHANGES: async () => {
            await votersAndVotesPage.unsavedChangesModal.discardInput.click();
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
          dataEntryHomePageWarningSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          dataEntryHomePageDiscarded: async () => {
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

        type MachineStates = typeof dataEntryMachineDefinition.states;
        type MachineStateKey = keyof MachineStates;
        type MachineEventKey = {
          [StateKey in MachineStateKey]: MachineStates[StateKey] extends {
            on: Record<infer EventKey, string>;
          }
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
