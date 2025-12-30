import { useContext } from "react";

import type { DataEntryStateAndActionsLoaded } from "../types/types";
import { DataEntryContext } from "./DataEntryContext";

export function useDataEntryContext(): DataEntryStateAndActionsLoaded {
  const context = useContext(DataEntryContext);

  if (!context) {
    throw new Error("useDataEntryContext must be used within a DataEntryProvider");
  }

  return context;
}
