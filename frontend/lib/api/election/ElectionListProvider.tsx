import * as React from "react";

import { NotFoundError } from "app/component/error";

import { useElectionListRequest } from "@kiesraad/api";

import { ElectionListProviderContext } from "./ElectionListProviderContext";

export interface ElectionListProviderProps {
  children: React.ReactNode;
}

export function ElectionListProvider({ children }: ElectionListProviderProps) {
  const { error, data, loading } = useElectionListRequest();

  if (loading) {
    return null;
  }

  if (error) {
    if (error.code === 404) {
      throw new NotFoundError("Verkiezingen niet gevonden");
    }

    throw error;
  }

  if (!data || !data.elections.length) {
    throw new NotFoundError("Verkiezingen niet gevonden");
  }

  return (
    <ElectionListProviderContext.Provider value={{ electionList: data.elections }}>
      {children}
    </ElectionListProviderContext.Provider>
  );
}
