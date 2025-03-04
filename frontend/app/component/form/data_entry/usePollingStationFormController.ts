import * as React from "react";

import { PollingStationControllerContext } from "./PollingStationControllerContext";

export function usePollingStationFormController() {
  const context = React.useContext(PollingStationControllerContext);

  if (!context) {
    throw new Error("usePollingStationFormController must be used within a PollingStationFormController");
  }

  return context;
}
