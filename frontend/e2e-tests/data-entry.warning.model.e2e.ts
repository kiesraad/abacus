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
  //   AbortInputModal,
  //   DifferencesPage,
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
    voterVotesPageEmpty: {
      on: {
        FILL_WITH_WARNING: "votersVotesPageWarningFilled",
      },
    },
    votersVotesPageWarningFilled: {
      on: {
        SUBMIT: "votersVotesPageWarning",
      },
    },
    votersVotesPageWarning: {
      on: {
        SUBMIT_WITH_UNACCEPTED_WARNING: "votersVotesPageWarningReminder",
      },
    },
    votersVotesPageWarningReminder: {},
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

const votesWarning: VotesCounts = {
  votes_candidates_count: 65,
  blank_votes_count: 0,
  invalid_votes_count: 35,
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
      test(path.description, async ({ page, pollingStation /*election*/ }) => {
        const pollingStationChoicePage = new PollingStationChoicePage(page);
        const recountedPage = new RecountedPage(page);
        const votersAndVotesPage = new VotersAndVotesPage(page);
        // const differencesPage = new DifferencesPage(page);
        // const abortModal = new AbortInputModal(page);

        const pollingStationsPageStates = {};
        const PollingStationsPageEvents = {};

        const recountedPageStates = {};
        const recountedPageEvents = {};

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
          votersVotesPageWarning: async () => {
            await expect(votersAndVotesPage.fieldset).toBeVisible();
            await expect(votersAndVotesPage.warning).toContainText(
              "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.",
            );
            await expect(votersAndVotesPage.acceptWarnings).toBeVisible();
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
        };
        const votersAndVotesPageEvents = {
          FILL_WITH_WARNING: async () => {
            await votersAndVotesPage.inputVotersCounts(voters);
            await votersAndVotesPage.inputVotesCounts(votesWarning);
          },
          SUBMIT: async () => {
            await votersAndVotesPage.next.click();
          },
          SUBMIT_WITH_UNACCEPTED_WARNING: async () => {
            await votersAndVotesPage.next.click();
          },
        };

        const differencesPageStates = {};
        const differencesPageEvents = {};

        const abortInputModalStates = {};
        const abortInputModalEvents = {};

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
