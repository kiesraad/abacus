import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import type {
  CSOFirstSessionResults,
  DATA_ENTRY_SAVE_REQUEST_BODY,
  DSOFirstSessionResults,
  NextSessionResults,
} from "@/types/generated/openapi";
import type { DataEntryModel, DataEntryStructure, FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";
import { ValidationResultSet } from "@/utils/ValidationResults";
import type { DataEntryStateAndActionsLoaded, DataEntryStateLoaded, FormSection } from "../types/types";

export function getCommonInitialValues(election = electionMockData): NextSessionResults {
  return {
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

export function getCSOInitialValues(election = electionMockData): CSOFirstSessionResults {
  const { voters_counts, votes_counts, differences_counts, political_group_votes } = getCommonInitialValues(election);
  return {
    extra_investigation: {
      extra_investigation_other_reason: { yes: false, no: false },
      ballots_recounted_extra_investigation: { yes: false, no: false },
    },
    counting_differences_polling_station: {
      difference_ballots_voters_completely_accounted_for: { yes: false, no: false },
      difference_ballots_per_list: { yes: false, no: false },
    },
    voters_counts,
    votes_counts,
    differences_counts,
    political_group_votes,
  };
}

export function getDSOInitialValues(election = electionMockData): DSOFirstSessionResults {
  const { voters_counts, votes_counts, differences_counts, political_group_votes } = getCommonInitialValues(election);
  return {
    about_report: {
      corrigendum_present: null,
      checks_and_corrections_present: null,
    },
    checks_and_corrections: {
      reason_investigation_own_initiative: { unaccounted_difference: false, other_error: false },
      corrected_results_own_initiative: { yes: false, no: false },
      corrected_results_csb_request: { yes: false, no: false },
    },
    voters_counts,
    votes_counts,
    differences_counts,
    political_group_votes,
  };
}

export function getDefaultFormSection(id: FormSectionId, index: number): FormSection {
  return {
    id,
    index,
    isDisabled: false,
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

export function getDefaultDataEntryState(model: DataEntryModel = "CSOFirstSession"): DataEntryStateLoaded {
  const commonSections: Record<string, FormSection> = {
    voters_votes_counts: getDefaultFormSection("voters_votes_counts", 2),
    differences_counts: getDefaultFormSection("differences_counts", 3),
    political_group_votes_1: getDefaultFormSection("political_group_votes_1", 4),
    save: getDefaultFormSection("save", 5),
  };
  const specificSections: Record<string, FormSection> =
    model === "CSOFirstSession"
      ? {
          extra_investigation: getDefaultFormSection("extra_investigation", 0),
          counting_differences_polling_station: getDefaultFormSection("counting_differences_polling_station", 1),
        }
      : model === "DSOFirstSession"
        ? {
            about_report: getDefaultFormSection("about_report", 0),
            checks_and_corrections: getDefaultFormSection("checks_and_corrections", 1),
          }
        : {};

  return {
    election: electionMockData,
    dataEntryId: 1,
    error: null,
    results:
      model === "CSOFirstSession"
        ? {
            model,
            ...getCSOInitialValues(),
          }
        : model === "DSOFirstSession"
          ? {
              model,
              ...getDSOInitialValues(),
            }
          : {
              model,
              ...getCommonInitialValues(),
            },
    entryNumber: 1,
    previousResults: null,
    source: {
      type: "PollingStation",
      id: pollingStationMockData[0]!.id,
      number: pollingStationMockData[0]!.number,
      name: pollingStationMockData[0]!.name,
      committee_session_id: 1,
      session_type: "First",
      data_entry_id: 1,
      locality: pollingStationMockData[0]!.locality,
      postal_code: pollingStationMockData[0]!.postal_code,
      address: pollingStationMockData[0]!.address,
    },
    dataEntryStatus: "first_entry_in_progress",
    dataEntryStructure: getDataEntryStructure(model, electionMockData),
    formState: {
      furthest: "voters_votes_counts",
      sections:
        model === "CSOFirstSession" || model === "DSOFirstSession"
          ? {
              ...specificSections,
              ...commonSections,
            }
          : {
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

export function getEmptyDataEntryRequest(): Omit<DATA_ENTRY_SAVE_REQUEST_BODY, "data"> & {
  data: CSOFirstSessionResults & { model: "CSOFirstSession" };
} {
  return {
    progress: 0,
    data: {
      model: "CSOFirstSession",
      ...getCSOInitialValues(),
    },
    client_state: {
      test: "test",
    },
  };
}

export function getDefaultDataEntryStateAndActionsLoaded(
  model: DataEntryModel = "CSOFirstSession",
): DataEntryStateAndActionsLoaded {
  return {
    ...getDefaultDataEntryState(model),
    dispatch: () => null,
    onSubmitForm: () => Promise.resolve(true),
    onDiscardDataEntry: () => Promise.resolve(true),
    onFinaliseDataEntry: () => Promise.resolve(undefined),
    setCache: () => null,
    updateFormSection: () => null,
    results: getCSOInitialValues(),
  };
}
