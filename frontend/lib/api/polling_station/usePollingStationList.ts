import * as React from "react";

import { PollingStationListProviderContext } from "./PollingStationListProvider";

export function usePollingStationList() {
  const context = React.useContext(PollingStationListProviderContext);
  if (context === undefined) {
    throw new Error("usePollingStationList must be used within a PollingStationListProvider");
  }
  return context;
}
