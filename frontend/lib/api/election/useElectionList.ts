import * as React from "react";
import { ElectionListProviderContext } from "./ElectionListProvider";

export function useElectionList() {
  const context = React.useContext(ElectionListProviderContext);
  if (context === undefined) {
    throw new Error("useElectionList must be used within a ElectionListProvider");
  }
  return context;
}
