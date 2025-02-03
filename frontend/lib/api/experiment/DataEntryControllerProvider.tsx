import * as React from "react";

import { Election } from "../gen/openapi";
import { DataEntryController, DataEntryState, initialState } from "./DataEntryController";
import { DataEntryControllerContext } from "./DataEntryControllerContext";

export interface DataEntryControllerProviderProps {
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  children: React.ReactNode;
}

export function DataEntryControllerProvider({ children, ...props }: DataEntryControllerProviderProps) {
  const [dataEntryState, setDataEntryState] = React.useState<DataEntryState>(() => initialState);
  const controller = React.useMemo(() => {
    return new DataEntryController({ setState: setDataEntryState, ...props });
  }, [props]);

  return (
    <DataEntryControllerContext.Provider value={{ controller, state: dataEntryState }}>
      {children}
    </DataEntryControllerContext.Provider>
  );
}
