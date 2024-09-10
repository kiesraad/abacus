import * as React from "react";

import { PollingStation, usePollingStationListRequest } from "@kiesraad/api";

export interface iPollingStationListProviderContext {
  pollingStationsLoading: boolean;
  pollingStations: PollingStation[];
}

export const PollingStationListProviderContext = React.createContext<iPollingStationListProviderContext>({
  pollingStationsLoading: true,
  pollingStations: [],
});

export interface PollingStationListProviderProps {
  electionId: number | undefined;
  children: React.ReactNode;
}

export function PollingStationListProvider({ electionId, children }: PollingStationListProviderProps) {
  const { data, loading } = usePollingStationListRequest({ election_id: electionId as number });

  return (
    <PollingStationListProviderContext.Provider
      value={{
        pollingStationsLoading: loading,
        pollingStations: data?.polling_stations ?? [],
      }}
    >
      {children}
    </PollingStationListProviderContext.Provider>
  );
}
