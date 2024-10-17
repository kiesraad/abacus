import * as React from "react";

import { PollingStation, usePollingStationListRequest } from "@kiesraad/api";

export interface iPollingStationListProviderContext {
  pollingStations: PollingStation[];
}

export const PollingStationListProviderContext = React.createContext<iPollingStationListProviderContext | undefined>(
  undefined,
);

export interface PollingStationListProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function PollingStationListProvider({ children, electionId }: PollingStationListProviderProps) {
  const { data, loading } = usePollingStationListRequest({ election_id: electionId });

  if (loading) {
    return null;
  }

  if (!data || !data.polling_stations.length) {
    return <div id="no-polling-station-data">Er zijn nog geen stembureaus aangemaakt voor deze verkiezing.</div>;
  }

  return (
    <PollingStationListProviderContext.Provider value={{ pollingStations: data.polling_stations }}>
      {children}
    </PollingStationListProviderContext.Provider>
  );
}
