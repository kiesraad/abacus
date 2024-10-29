import * as React from "react";

import { NotFoundError } from "app/component/error";

import { useElectionListRequest } from "@kiesraad/api";

import { ElectionListProviderContext } from "./ElectionListProviderContext";

export interface ElectionListProviderProps {
  children: React.ReactNode;
}

export function ElectionListProvider({ children }: ElectionListProviderProps) {
  const { state } = useElectionListRequest();

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "api-error") {
    if (state.error.code === 404) {
      throw new NotFoundError("Verkiezingen niet gevonden");
    }

    throw state.error;
  }

  if (state.status === "network-error") {
    throw state.error;
  }

  if (!state.data.elections.length) {
    throw new NotFoundError("Verkiezingen niet gevonden");
  }

  return (
    <ElectionListProviderContext.Provider value={{ electionList: state.data.elections }}>
      {children}
    </ElectionListProviderContext.Provider>
  );
}
