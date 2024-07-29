import * as React from "react";

import { PollingStationProviderContext } from "./PollingStationProvider";

export function usePollingStation() {
  const context = React.useContext(PollingStationProviderContext);
  if (context === undefined) {
    throw new Error("usePollingStation must be used within a PollingStationProvider");
  }
  return context;
}
