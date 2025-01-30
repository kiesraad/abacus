import * as React from "react";

import { DataEntryController, DataEntryState } from "./DataEntryController";

export interface iDataEntryControllerContext {
  controller: DataEntryController;
  state: DataEntryState;
}

export const DataEntryControllerContext = React.createContext<iDataEntryControllerContext | undefined>(undefined);
