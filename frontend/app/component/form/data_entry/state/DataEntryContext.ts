import { createContext } from "react";

import { DataEntryStateAndActionsLoaded } from "./types";

export const DataEntryContext = createContext<DataEntryStateAndActionsLoaded | null>(null);
