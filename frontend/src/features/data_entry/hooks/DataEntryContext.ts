import { createContext } from "react";

import type { DataEntryStateAndActionsLoaded } from "../types/types";

export const DataEntryContext = createContext<DataEntryStateAndActionsLoaded | null>(null);
