import { useState } from "react";

import { ElectionDefinitionValidateResponse } from "@/types/generated/openapi";

import { ElectionCreateContext, IElectionCreateContext } from "../hooks/ElectionCreateContext";

export function ElectionCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [data, setData] = useState<ElectionDefinitionValidateResponse | undefined>(undefined);

  const context: IElectionCreateContext = { file, setFile, data, setData };
  return <ElectionCreateContext.Provider value={context}>{children}</ElectionCreateContext.Provider>;
}
