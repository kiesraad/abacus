import { type ReactNode, useReducer } from "react";

import type {
  CommitteeCategory,
  ElectionDefinitionValidateResponse,
  NewElection,
  PollingStationRequest,
  RedactedEmlHash,
  RegionDetails,
  RegionKey,
  VoteCountingMethod,
} from "@/types/generated/openapi";

import { ElectionCreateContext, type IElectionCreateContext } from "../hooks/ElectionCreateContext";

export type ElectionCreateAction =
  | {
      type: "SELECT_ELECTION_DEFINITION";
      response: ElectionDefinitionValidateResponse;
      electionDefinitionData: string;
      electionDefinitionFileName: string;
    }
  | {
      type: "SET_ELECTION_DEFINITION_HASH";
      electionDefinitionHash: string[];
    }
  | {
      type: "SELECT_CANDIDATES_DEFINITION";
      response: ElectionDefinitionValidateResponse;
      candidateDefinitionData: string;
      candidateDefinitionFileName: string;
    }
  | {
      type: "SET_CANDIDATES_DEFINITION_HASH";
      candidateDefinitionHash: string[];
    }
  | {
      type: "SET_GSB_SELECTED";
      response: ElectionDefinitionValidateResponse;
      gsbSelected: RegionKey;
    }
  | {
      type: "SELECT_POLLING_STATION_DEFINITION";
      response: ElectionDefinitionValidateResponse;
      pollingStationDefinitionData: string;
      pollingStationDefinitionFileName: string;
      pollingStationDefinitionMatchesElection?: boolean;
    }
  | {
      type: "SET_COUNTING_METHOD_TYPE";
      countingMethod: VoteCountingMethod;
    }
  | {
      type: "SET_COMMITTEE_CATEGORY";
      committeeCategory: CommitteeCategory;
    }
  | {
      type: "SET_NUMBER_OF_VOTERS";
      numberOfVoters: number;
      isNumberOfVotersUserEdited: boolean;
    };

export interface ElectionCreateState {
  election?: NewElection;
  pollingStations?: PollingStationRequest[] | null;
  electionDefinitionHash?: string[];
  electionDefinitionData?: string;
  electionDefinitionFileName?: string;
  electionDefinitionRedactedHash?: RedactedEmlHash;
  candidateDefinitionHash?: string[];
  candidateDefinitionData?: string;
  candidateDefinitionFileName?: string;
  candidateDefinitionRedactedHash?: RedactedEmlHash;
  gsbList?: RegionDetails[];
  gsbSelected?: RegionKey;
  pollingStationDefinitionData?: string;
  pollingStationDefinitionFileName?: string;
  pollingStationDefinitionMatchesElection?: boolean;
  countingMethod?: VoteCountingMethod;
  numberOfVoters?: number;
  committeeCategory?: CommitteeCategory;
  isNumberOfVotersUserEdited?: boolean;
}

const resetPollingStations = {
  pollingStations: undefined,
  pollingStationDefinitionData: undefined,
  pollingStationDefinitionFileName: undefined,
  pollingStationDefinitionMatchesElection: undefined,
  numberOfVoters: undefined,
  isNumberOfVotersUserEdited: undefined,
} satisfies ElectionCreateState;

function selectPollingStationDefinition(
  state: ElectionCreateState,
  action: Extract<ElectionCreateAction, { type: "SELECT_POLLING_STATION_DEFINITION" }>,
): ElectionCreateState {
  if (action.response.committee_category !== "GSB") {
    return state;
  }
  return {
    ...state,
    pollingStations: action.response.polling_stations,
    pollingStationDefinitionData: action.pollingStationDefinitionData,
    pollingStationDefinitionFileName: action.pollingStationDefinitionFileName,
    pollingStationDefinitionMatchesElection: action.pollingStationDefinitionMatchesElection,
    numberOfVoters: action.response.number_of_voters,
    isNumberOfVotersUserEdited: false,
  };
}

function reducer(state: ElectionCreateState, action: ElectionCreateAction): ElectionCreateState {
  switch (action.type) {
    case "SELECT_ELECTION_DEFINITION":
      return {
        ...state,
        ...resetPollingStations,
        election: action.response.election,
        electionDefinitionRedactedHash: action.response.hash,
        electionDefinitionData: action.electionDefinitionData,
        electionDefinitionFileName: action.electionDefinitionFileName,
        electionDefinitionHash: undefined,
        candidateDefinitionRedactedHash: undefined,
        candidateDefinitionData: undefined,
        candidateDefinitionFileName: undefined,
        isNumberOfVotersUserEdited: false,
        committeeCategory: undefined,
        countingMethod: undefined,
        gsbList: action.response.committee_category === "GSB" ? action.response.gsb_list : undefined,
        gsbSelected: undefined,
      };
    case "SET_ELECTION_DEFINITION_HASH":
      return { ...state, electionDefinitionHash: action.electionDefinitionHash };
    case "SELECT_CANDIDATES_DEFINITION":
      return {
        ...state,
        ...resetPollingStations,
        election: action.response.election,
        candidateDefinitionRedactedHash: action.response.hash,
        candidateDefinitionData: action.candidateDefinitionData,
        candidateDefinitionFileName: action.candidateDefinitionFileName,
        candidateDefinitionHash: undefined,
      };
    case "SET_CANDIDATES_DEFINITION_HASH":
      return { ...state, candidateDefinitionHash: action.candidateDefinitionHash };
    case "SET_GSB_SELECTED":
      return { ...state, ...resetPollingStations, gsbSelected: action.gsbSelected, election: action.response.election };
    case "SELECT_POLLING_STATION_DEFINITION":
      return selectPollingStationDefinition(state, action);
    case "SET_COUNTING_METHOD_TYPE":
      return { ...state, countingMethod: action.countingMethod };
    case "SET_COMMITTEE_CATEGORY":
      return { ...state, committeeCategory: action.committeeCategory };
    case "SET_NUMBER_OF_VOTERS":
      return {
        ...state,
        numberOfVoters: action.numberOfVoters,
        isNumberOfVotersUserEdited: action.isNumberOfVotersUserEdited,
      };
  }
}

export function ElectionCreateContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});
  const context: IElectionCreateContext = { state, dispatch };
  return <ElectionCreateContext.Provider value={context}>{children}</ElectionCreateContext.Provider>;
}
