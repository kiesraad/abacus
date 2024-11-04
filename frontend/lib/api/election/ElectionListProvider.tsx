import * as React from "react";

import { NotFoundError } from "app/component/error";

import { useElectionListRequest } from "@kiesraad/api";

import { ElectionListProviderContext } from "./ElectionListProviderContext";

export interface ElectionListProviderProps {
  children: React.ReactNode;
}

export function ElectionListProvider({ children }: ElectionListProviderProps) {
  const { requestState } = useElectionListRequest();

  if (requestState.status === "loading") {
    return null;
  }

  if (requestState.status === "api-error") {
    if (requestState.error.code === 404) {
      throw new NotFoundError("Verkiezingen niet gevonden");
    }

    throw requestState.error;
  }

  if (requestState.status === "network-error") {
    throw requestState.error;
  }

  if (!requestState.data.elections.length) {
    throw new NotFoundError("Verkiezingen niet gevonden");
  }

  return (
    <ElectionListProviderContext.Provider value={{ electionList: requestState.data.elections }}>
      {children}
    </ElectionListProviderContext.Provider>
  );
}
