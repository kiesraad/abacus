import { createContext } from "react";

import { DataEntryStateAndActions } from "./types";

export const DataEntryContext = createContext<DataEntryStateAndActions | null>(null);
