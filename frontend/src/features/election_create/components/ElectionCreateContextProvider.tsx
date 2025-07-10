import { useReducer } from "react";

import {
  ElectionDefinitionValidateResponse,
  NewElection,
  PollingStationRequest,
  RedactedEmlHash,
} from "@/types/generated/openapi";

import { ElectionCreateContext, IElectionCreateContext } from "../hooks/ElectionCreateContext";

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
      type: "SELECT_POLLING_STATION_DEFINITION";
      response: ElectionDefinitionValidateResponse;
      pollingStationDefinitionData: string;
      pollingStationDefinitionFileName: string;
    }
  | {
      type: "RESET";
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
  pollingStationDefinitionData?: string;
  pollingStationDefinitionFileName?: string;
}

function reducer(state: ElectionCreateState, action: ElectionCreateAction): ElectionCreateState {
  switch (action.type) {
    case "SELECT_ELECTION_DEFINITION":
      return {
        ...state,
        election: action.response.election,
        pollingStations: null,
        electionDefinitionRedactedHash: action.response.hash,
        electionDefinitionData: action.electionDefinitionData,
        electionDefinitionFileName: action.electionDefinitionFileName,
        electionDefinitionHash: undefined,
        candidateDefinitionRedactedHash: undefined,
        candidateDefinitionData: undefined,
        candidateDefinitionFileName: undefined,
      };
    case "SET_ELECTION_DEFINITION_HASH":
      return {
        ...state,
        electionDefinitionHash: action.electionDefinitionHash,
      };
    case "SELECT_CANDIDATES_DEFINITION":
      return {
        ...state,
        election: action.response.election,
        candidateDefinitionRedactedHash: action.response.hash,
        candidateDefinitionData: action.candidateDefinitionData,
        candidateDefinitionFileName: action.candidateDefinitionFileName,
        candidateDefinitionHash: undefined,
      };
    case "SET_CANDIDATES_DEFINITION_HASH":
      return {
        ...state,
        candidateDefinitionHash: action.candidateDefinitionHash,
      };
    case "SELECT_POLLING_STATION_DEFINITION":
      return {
        ...state,
        pollingStations: action.response.polling_stations,
        pollingStationDefinitionData: action.pollingStationDefinitionData,
        pollingStationDefinitionFileName: action.pollingStationDefinitionFileName,
      };
    // Empty the state
    case "RESET":
      return {};
  }
}

export function ElectionCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});
  const context: IElectionCreateContext = { state, dispatch };
  return <ElectionCreateContext.Provider value={context}>{children}</ElectionCreateContext.Provider>;
}
