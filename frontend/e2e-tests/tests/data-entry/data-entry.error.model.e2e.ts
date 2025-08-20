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
  assertMachineAndImplementationMatches,
  typeCheckedMachineDefinition,
} from "../../helpers-utils/xstate-helpers";

/*
This model-based e2e test covers the state changes from one section (the voters and votes page) that trigger errors.
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
    dataEntryHomePageErrorSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeError",
      },
    },
    dataEntryHomePageChangedToErrorSaved: {
      on: {
        RESUME_DATA_ENTRY: "votersVotesPageAfterResumeErrorChanged",
      },
    },
    dataEntryHomePageDiscarded: {},
    countingDifferencesPollingStationPageErrorSubmitted: {
      on: {
        GO_TO_VOTERS_VOTES_PAGE: "votersVotesPageErrorSubmitted",
      },
    },
    countingDifferencesPollingStationPageChangedToErrorSubmitted: {},
    countingDifferencesPollingStationPageChangedToErrorDiscarded: {},
    countingDifferencesPollingStationPageFilledError: {},
    votersVotesPageEmpty: {
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
        GO_TO_PREVIOUS_PAGE: "unsavedChangesModalChangedToError",
      },
    },
    VotersVotesPageFilledError: {
      on: {
        SUBMIT: "votersVotesPageErrorSubmitted",
        GO_TO_PREVIOUS_PAGE: "countingDifferencesPollingStationPageFilledError",
      },
    },
    votersVotesPageErrorSubmitted: {
      on: {
        CORRECT_ERROR_DATA: "votersVotesPageCorrected",
        CHANGE_TO_WARNING_AND_SUBMIT: "votersVotesPageWarningSubmitted",
        CLICK_ABORT: "abortInputModalErrorSubmitted",
        NAV_TO_HOME_PAGE: "abortInputModalErrorSubmitted",
        GO_TO_PREVIOUS_PAGE: "countingDifferencesPollingStationPageErrorSubmitted",
        // no GO_TO_DIFFERENCES_PAGE, because unreachable
      },
    },
    votersVotesPageChangedToErrorSubmitted: {
      on: {
        CORRECT_ERROR_DATA: "votersVotesPageCorrected",
        CLICK_ABORT: "abortInputModalChangedToErrorSubmitted",
        NAV_TO_HOME_PAGE: "abortInputModalChangedToErrorSubmitted",
        // no GO_TO_PREVIOUS_PAGE because too similar to same action on votersVotesPageErrorSubmitted
        GO_TO_DIFFERENCES_PAGE: "differencesPageError",
      },
    },
    votersVotesPageCorrected: {
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
        SAVE_INPUT: "dataEntryHomePageErrorSaved",
        DISCARD_INPUT: "dataEntryHomePageDiscarded",
      },
    },
    abortInputModalChangedToErrorSubmitted: {
      on: {
        SAVE_INPUT: "dataEntryHomePageChangedToErrorSaved",
        DISCARD_INPUT: "dataEntryHomePageDiscarded",
      },
    },
    unsavedChangesModalChangedToError: {
      on: {
        SAVE_UNSUBMITTED_CHANGES: "countingDifferencesPollingStationPageChangedToErrorSubmitted",
        DISCARD_UNSUBMITTED_CHANGES: "countingDifferencesPollingStationPageChangedToErrorDiscarded",
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

const votersError: VotersCounts = {
  poll_card_count: 70,
  proxy_certificate_count: 30,
  total_admitted_voters_count: 90, // incorrect total
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

const votesWarning: VotesCounts = {
  political_group_total_votes: [
    { number: 1, total: 50 },
    { number: 2, total: 10 },
    { number: 3, total: 0 },
  ],
  total_votes_candidates_count: 60,
  blank_votes_count: 40,
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

test.describe("Data entry model test - errors", () => {
  createTestModel(machine)
    .getSimplePaths()
    .forEach((path) => {
      // eslint-disable-next-line playwright/valid-title
      test(path.description, async ({ page, pollingStation, election }) => {
        const dataEntryHomePage = new DataEntryHomePage(page);
        const extraInvestigationPage = new ExtraInvestigationPage(page);
        const countingDifferencesPage = new CountingDifferencesPollingStationPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        const differencesPage = new DifferencesPage(page);
        const abortModal = new AbortInputModal(page);
        const navBar = new TypistNavBar(page);

        await page.goto(`/elections/${pollingStation.election_id}/data-entry`);
        await dataEntryHomePage.selectPollingStationAndClickStart(pollingStation);
        await extraInvestigationPage.fillAndClickNext(noExtraInvestigation);
        await countingDifferencesPage.fillAndClickNext(noDifferences);

        const dataEntryHomePageStates = {
          dataEntryHomePageErrorSaved: async () => {
            await expect(dataEntryHomePage.fieldset).toBeVisible();
            await expect(dataEntryHomePage.allDataEntriesInProgress).toHaveText([
              `${pollingStation.number} - ${pollingStation.name}`,
            ]);
          },
          dataEntryHomePageChangedToErrorSaved: async () => {
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
          countingDifferencesPollingStationPageErrorSubmitted: async () => {
            await expect(countingDifferencesPage.fieldset).toBeVisible();
            const countingDifferencesFields = await countingDifferencesPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
            await expect(countingDifferencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName(
              "bevat een fout",
            );
          },
          countingDifferencesPollingStationPageChangedToErrorSubmitted: async () => {
            await expect(countingDifferencesPage.fieldset).toBeVisible();
            const countingDifferencesFields = await countingDifferencesPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
            await expect(countingDifferencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName(
              "bevat een fout",
            );
          },
          countingDifferencesPollingStationPageFilledError: async () => {
            await expect(countingDifferencesPage.fieldset).toBeVisible();
            const countingDifferencesFields = await countingDifferencesPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
            await expect(countingDifferencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName(
              "nog niet afgerond",
            );
          },
          countingDifferencesPollingStationPageChangedToErrorDiscarded: async () => {
            await expect(countingDifferencesPage.fieldset).toBeVisible();
            const countingDifferencesFields = await countingDifferencesPage.getCountingDifferencesPollingStation();
            expect(countingDifferencesFields).toStrictEqual(noDifferences);
            await expect(countingDifferencesPage.progressList.votersAndVotesIcon).toHaveAccessibleName("opgeslagen");
          },
        };

        const countingDifferencesPollingStationPageEvents = {
          GO_TO_VOTERS_VOTES_PAGE: async () => {
            await countingDifferencesPage.progressList.votersAndVotes.click();
          },
        };

        const votersVotesPageStates = {
          votersVotesPageEmpty: async () => {
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
            await expect(votersAndVotesPage.warning).toContainText("W.201");
            await expect(votersAndVotesPage.warning).toContainText("Controleer aantal blanco stemmen");
          },
          unsavedChangesModalChangedToError: async () => {
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
          CHANGE_TO_WARNING_AND_SUBMIT: async () => {
            await votersAndVotesPage.inputVotersCounts(voters);
            await votersAndVotesPage.inputVotesCounts(votesWarning);
            await votersAndVotesPage.next.click();
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
          GO_TO_DIFFERENCES_PAGE: async () => {
            await votersAndVotesPage.progressList.differences.click();
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
