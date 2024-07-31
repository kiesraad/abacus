import * as React from "react";

import { PollingStationListProviderContext } from "./PollingStationListProvider";

export function usePollingStationList() {
  return React.useContext(PollingStationListProviderContext);
}
