import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY, PollingStationResults } from "@/types/generated/openapi";
import { DataEntryStructure, FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";
import { ValidationResultSet } from "@/utils/ValidationResults";

import { DataEntryState, DataEntryStateAndActionsLoaded, FormSection } from "../types/types";

export function getInitialValues(): PollingStationResults {
  return {
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      votes_candidates_count: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: electionMockData.political_groups.map((pg) => ({
      number: pg.number,
      total: 0,
      candidate_votes: pg.candidates.map((c) => ({
        number: c.number,
        votes: 0,
      })),
    })),
  };
}

export function getDefaultFormSection(id: FormSectionId, index: number): FormSection {
  return {
    id,
    index,
    isSaved: false,
    acceptErrorsAndWarnings: false,
    hasChanges: false,
    acceptErrorsAndWarningsError: false,
    errors: new ValidationResultSet(),
    warnings: new ValidationResultSet(),
  };
}

export function getDefaultDataEntryStructure(): DataEntryStructure {
  return getDataEntryStructure(electionMockData);
}

export function getDefaultDataEntryState(): DataEntryState {
  return {
    election: electionMockData,
    pollingStationId: 1,
    error: null,
    pollingStationResults: null,
    entryNumber: 1,
    dataEntryStructure: getDataEntryStructure(electionMockData),
    formState: {
      furthest: "voters_votes_counts",
      sections: {
        voters_votes_counts: getDefaultFormSection("voters_votes_counts", 0),
        differences_counts: getDefaultFormSection("differences_counts", 1),
        political_group_votes_1: getDefaultFormSection("political_group_votes_1", 2),
        save: getDefaultFormSection("save", 3),
      },
    },
    targetFormSectionId: "voters_votes_counts",
    status: "idle",
    cache: null,
  };
}

export function getEmptyDataEntryRequest(): POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY {
  return {
    progress: 0,
    data: getInitialValues(),
    client_state: {
      test: "test",
    },
  };
}

export function getDefaultDataEntryStateAndActionsLoaded(): DataEntryStateAndActionsLoaded {
  return {
    ...getDefaultDataEntryState(),
    dispatch: () => null,
    onSubmitForm: () => Promise.resolve(true),
    onDeleteDataEntry: () => Promise.resolve(true),
    onFinaliseDataEntry: () => Promise.resolve(undefined),
    setCache: () => null,
    updateFormSection: () => null,
    pollingStationResults: getInitialValues(),
  };
}
