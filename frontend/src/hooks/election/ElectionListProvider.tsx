import * as React from "react";

import RequestStateHandler from "@/api/RequestStateHandler";

import { ElectionListProviderContext } from "./ElectionListProviderContext";
import { useElectionListRequest } from "./useElectionListRequest";

export interface ElectionListProviderProps {
  children: React.ReactNode;
}

export function ElectionListProvider({ children }: ElectionListProviderProps) {
  const { requestState } = useElectionListRequest();

  return (
    <RequestStateHandler
      requestState={requestState}
      renderOnSuccess={(data) => (
        <ElectionListProviderContext.Provider value={{ electionList: data.elections }}>
          {children}
        </ElectionListProviderContext.Provider>
      )}
    />
  );
}
