import { GetDataEntryResponse, PollingStationResults } from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";
import { overrideOnce } from "@kiesraad/test";

import { getClientState } from "./state/dataEntryUtils";
import { DataEntryState, FormSection, FormState } from "./state/types";

const defaultFormSection: Omit<FormSection, "id" | "index"> = {
  title: "Toegelaten kiezers en uitgebrachte stemmen",
  isSaved: false,
  acceptWarnings: false,
  hasChanges: false,
  acceptWarningsError: false,
  errors: [],
  warnings: [],
};

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

const defaultFormState: DataEntryState = {
  election: electionMockData,
  pollingStationId: 1,
  error: null,
  pollingStationResults: null,
  entryNumber: 1,
  formState: {
    current: "voters_votes_counts",
    furthest: "voters_votes_counts",
    sections: {
      recounted: {
        id: "recounted",
        index: 1,
        ...defaultFormSection,
      },
      voters_votes_counts: {
        id: "voters_votes_counts",
        index: 2,
        ...defaultFormSection,
      },
      differences_counts: {
        id: "differences_counts",
        index: 3,
        ...defaultFormSection,
      },
      save: {
        id: "save",
        index: 4,
        ...defaultFormSection,
      },
    },
  },
  targetFormSectionId: "recounted",
  status: "idle",
  cache: null,
};

export interface OverrideServerGetDataEntryResponseProps {
  formState?: FormState;
  pollingStationResults: Partial<PollingStationResults>;
  acceptWarnings?: boolean;
  continueToNextSection?: boolean;
  progress?: number;
}

export function overrideServerGetDataEntryResponse({
  formState,
  pollingStationResults,
  acceptWarnings = false,
  continueToNextSection = true,
  progress = 1,
}: OverrideServerGetDataEntryResponseProps) {
  overrideOnce("get", "/api/polling_stations/1/data_entries/1", 200, {
    client_state: getClientState(formState || defaultFormState.formState, acceptWarnings, continueToNextSection),
    data: {
      ...initialValues,
      ...pollingStationResults,
    },
    progress,
    updated_at: "",
    validation_results: { errors: [], warnings: [] },
  } satisfies GetDataEntryResponse);
}
