import { useReducer } from "react";

import { ElectionDefinitionValidateResponse, NewElection, RedactedEmlHash } from "@/types/generated/openapi";

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
      type: "RESET";
    };

export interface ElectionCreateState {
  election?: NewElection;
  electionDefinitionHash?: string[];
  electionDefinitionData?: string;
  electionDefinitionFileName?: string;
  electionDefinitionRedactedHash?: RedactedEmlHash;
  candidateDefinitionHash?: string[];
  candidateDefinitionData?: string;
  candidateDefinitionFileName?: string;
  candidateDefinitionRedactedHash?: RedactedEmlHash;
}

function reducer(state: ElectionCreateState, action: ElectionCreateAction): ElectionCreateState {
  switch (action.type) {
    case "SELECT_ELECTION_DEFINITION":
      return {
        ...state,
        election: action.response.election,
        electionDefinitionRedactedHash: action.response.hash,
        electionDefinitionData: action.electionDefinitionData,
        electionDefinitionFileName: action.electionDefinitionFileName,
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
      };
    case "SET_CANDIDATES_DEFINITION_HASH":
      return {
        ...state,
        candidateDefinitionHash: action.candidateDefinitionHash,
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
