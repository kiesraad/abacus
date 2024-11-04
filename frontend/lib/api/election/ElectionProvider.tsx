import * as React from "react";

import { NotFoundError } from "app/component/error";

import { Election, useElectionDataRequest } from "@kiesraad/api";
import { Loader } from "@kiesraad/ui";

import { ElectionProviderContext } from "./ElectionProviderContext";

export interface ElectionProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionProvider({ children, electionId }: ElectionProviderProps) {
  const { requestState } = useElectionDataRequest(electionId);

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if (requestState.status === "api-error") {
    if (requestState.error.code === 404) {
      throw new NotFoundError("Verkiezing niet gevonden");
    }

    throw requestState.error;
  }

  if (requestState.status === "network-error") {
    throw requestState.error;
  }

  return (
    <ElectionProviderContext.Provider
      value={{
        election: requestState.data.election as Required<Election>,
        pollingStations: requestState.data.polling_stations,
      }}
    >
      {children}
    </ElectionProviderContext.Provider>
  );
}
