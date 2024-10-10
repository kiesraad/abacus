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

  if (!data) {
    return <div>Error no polling stations data</div>;
  }

  return (
    <PollingStationListProviderContext.Provider value={{ pollingStations: data.polling_stations }}>
      {children}
    </PollingStationListProviderContext.Provider>
  );
}
