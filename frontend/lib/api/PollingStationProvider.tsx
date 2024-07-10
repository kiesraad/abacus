import * as React from "react";
import { PollingStation } from "./gen/openapi";
import { usePollingStationListRequest } from "./usePollingStation";

export interface iPollingStationsContext {
  pollingStationsLoading: boolean;
  pollingStations: PollingStation[];
}

export const PollingStationsContext = React.createContext<iPollingStationsContext>({
  pollingStationsLoading: true,
  pollingStations: [],
});

export interface PollingStationProviderProps {
  electionId: number | undefined;
  children: React.ReactNode;
}

export function PollingStationProvider({ electionId, children }: PollingStationProviderProps) {
  const { data, loading } = usePollingStationListRequest({ election_id: electionId as number });

  return (
    <PollingStationsContext.Provider
      value={{
        pollingStationsLoading: loading,
        pollingStations: data?.polling_stations ?? [],
      }}
    >
      {children}
    </PollingStationsContext.Provider>
  );
}
