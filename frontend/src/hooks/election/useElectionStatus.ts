import { useContext } from "react";

import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";

export function useElectionStatus() {
  const context = useContext(ElectionStatusProviderContext);

  if (!context) {
    throw new Error("useElectionStatus must be used within an ElectionStatusProvider");
  }

  return context;
}
