import { useContext } from "react";

import { ElectionStatusProviderContext } from "./ElectionStatusProvider";

export function useElectionStatus() {
  const context = useContext(ElectionStatusProviderContext);
  if (context === undefined) {
    throw new Error("useElectionStatus must be used within an ElectionStatusProvider");
  }
  return context;
}
