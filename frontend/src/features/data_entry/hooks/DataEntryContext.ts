import { createContext } from "react";

import { DataEntryStateAndActionsLoaded } from "../types/types";

export const DataEntryContext = createContext<DataEntryStateAndActionsLoaded | null>(null);
