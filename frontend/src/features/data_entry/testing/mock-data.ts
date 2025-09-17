import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { CSOFirstSessionResults, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY } from "@/types/generated/openapi";
import { DataEntryModel, DataEntryStructure, FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";
import { ValidationResultSet } from "@/utils/ValidationResults";

import { DataEntryStateAndActionsLoaded, DataEntryStateLoaded, FormSection } from "../types/types";

export function getInitialValues(election = electionMockData): CSOFirstSessionResults {
  return {
    extra_investigation: {
      extra_investigation_other_reason: { yes: false, no: false },
      ballots_recounted_extra_investigation: { yes: false, no: false },
    },
    counting_differences_polling_station: {
      unexplained_difference_ballots_voters: { yes: false, no: false },
      difference_ballots_per_list: { yes: false, no: false },
    },
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      political_group_total_votes: election.political_groups.map((pg) => ({
        number: pg.number,
        total: 0,
      })),
      total_votes_candidates_count: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      compare_votes_cast_admitted_voters: {
        admitted_voters_equal_votes_cast: false,
        votes_cast_greater_than_admitted_voters: false,
        votes_cast_smaller_than_admitted_voters: false,
      },
      difference_completely_accounted_for: { yes: false, no: false },
    },
    political_group_votes: election.political_groups.map((pg) => ({
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
  return getDataEntryStructure("CSOFirstSession", electionMockData);
}

export function getDefaultDataEntryState(): DataEntryStateLoaded {
  const model: DataEntryModel = "CSOFirstSession";
  return {
    election: electionMockData,
    pollingStationId: 1,
    error: null,
    pollingStationResults: { model, ...getInitialValues() },
    entryNumber: 1,
    previousResults: null,
    dataEntryStructure: getDataEntryStructure(model, electionMockData),
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
    data: {
      model: "CSOFirstSession",
      ...getInitialValues(),
    },
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
