import { createContext } from "react";

import { ElectionDefinitionUploadResponse } from "@/types/generated/openapi";

export interface IElectionCreateContext {
  file: File | undefined;
  setFile: (role: File | undefined) => void;
  data: ElectionDefinitionUploadResponse | undefined;
  setData: (data: ElectionDefinitionUploadResponse | undefined) => void;
}

export const ElectionCreateContext = createContext<IElectionCreateContext | undefined>(undefined);
