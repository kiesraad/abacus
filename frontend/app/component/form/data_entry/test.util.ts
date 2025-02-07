import { GetDataEntryResponse, PollingStationResults } from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";
import { overrideOnce } from "@kiesraad/test";
import { ValidationResult } from "@kiesraad/util";

import { getClientState } from "./state/dataEntryUtils";
import { DataEntryState, FormSection, FormSectionId, FormState } from "./state/types";

const initialValues: PollingStationResults = {
  recounted: undefined,
  voters_counts: {
    poll_card_count: 0,
    proxy_certificate_count: 0,
    voter_card_count: 0,
    total_admitted_voters_count: 0,
  },
  votes_counts: {
    votes_candidates_count: 0,
    blank_votes_count: 0,
    invalid_votes_count: 0,
    total_votes_cast_count: 0,
  },
  voters_recounts: undefined,
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

export const defaultFormSection: Omit<FormSection, "id" | "index"> = {
  title: "Toegelaten kiezers en uitgebrachte stemmen",
  isSaved: false,
  acceptWarnings: false,
  hasChanges: false,
  acceptWarningsError: false,
  errors: [],
  warnings: [],
};

export interface OverrideServerGetDataEntryResponseProps {
  formState: FormState;
  pollingStationResults: Partial<PollingStationResults>;
  acceptWarnings?: boolean;
  continueToNextSection?: boolean;
  progress?: number;
  validationResults?: GetDataEntryResponse["validation_results"];
}

export function overrideServerGetDataEntryResponse({
  formState,
  pollingStationResults,
  acceptWarnings = false,
  continueToNextSection = true,
  progress = 1,
  validationResults = { errors: [], warnings: [] },
}: OverrideServerGetDataEntryResponseProps) {
  overrideOnce("get", "/api/polling_stations/1/data_entries/1", 200, {
    client_state: getClientState(formState, acceptWarnings, continueToNextSection),
    data: {
      ...initialValues,
      ...pollingStationResults,
    },
    progress,
    updated_at: "",
    validation_results: validationResults,
  } satisfies GetDataEntryResponse);
}
