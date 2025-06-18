import { createContext, Dispatch } from "react";

import { ElectionCreateAction, ElectionCreateState } from "../components/ElectionCreateContextProvider";

export interface IElectionCreateContext {
  state: ElectionCreateState;
  dispatch: Dispatch<ElectionCreateAction>;
}

export const ElectionCreateContext = createContext<IElectionCreateContext | undefined>(undefined);
