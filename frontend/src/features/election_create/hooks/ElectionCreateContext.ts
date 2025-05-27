import { createContext } from "react";

import { ElectionDefinitionValidateResponse } from "@/types/generated/openapi";

export interface IElectionCreateContext {
  file: File | undefined;
  setFile: (role: File | undefined) => void;
  data: ElectionDefinitionValidateResponse | undefined;
  setData: (data: ElectionDefinitionValidateResponse | undefined) => void;
}

export const ElectionCreateContext = createContext<IElectionCreateContext | undefined>(undefined);
