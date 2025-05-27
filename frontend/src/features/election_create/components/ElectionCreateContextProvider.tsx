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
    };

export interface ElectionCreateState {
  electionDefinitionRedactedHash?: RedactedEmlHash;
  election?: NewElection;
  electionDefinitionHash?: string[];
  electionDefinitionData?: string;
  electionDefinitionFileName?: string;
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
  }
}

export function ElectionCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});
  const context: IElectionCreateContext = { state, dispatch };
  return <ElectionCreateContext.Provider value={context}>{children}</ElectionCreateContext.Provider>;
}
