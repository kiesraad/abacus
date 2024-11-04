import { useContext } from "react";

import { ElectionListProviderContext } from "./ElectionListProviderContext";

export function useElectionList() {
  const context = useContext(ElectionListProviderContext);

  if (!context) {
    throw new Error("useElectionList must be used within a ElectionListProvider");
  }

  return context;
}
