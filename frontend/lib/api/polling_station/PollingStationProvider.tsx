import * as React from "react";

import { PollingStation, usePollingStationDataRequest } from "@kiesraad/api";

export interface iPollingStationProviderContext {
  pollingStation: Required<PollingStation>;
}

export const PollingStationProviderContext = React.createContext<
  iPollingStationProviderContext | undefined
>(undefined);

export interface PollingStationProviderProps {
  children: React.ReactNode;
  pollingStationId: number;
}

export function PollingStationProvider({
  children,
  pollingStationId,
}: PollingStationProviderProps) {
  const { data, loading } = usePollingStationDataRequest({
    polling_station_id: pollingStationId,
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Error no polling station data</div>;
  }

  return (
    <PollingStationProviderContext.Provider
      value={{ pollingStation: data.polling_station as Required<PollingStation> }}
    >
      {children}
    </PollingStationProviderContext.Provider>
  );
}
