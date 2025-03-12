import * as React from "react";

import RequestStateHandler from "@/api/RequestStateHandler";
import { useElectionListRequest } from "@/hooks/election/useElectionListRequest";

import { ElectionListProviderContext } from "./ElectionListProviderContext";

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
