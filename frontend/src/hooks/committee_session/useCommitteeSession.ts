import { useContext } from "react";

import { CommitteeSessionProviderContext } from "./CommitteeSessionProviderContext";

// fetch the current election and polling stations from the context
export function useCommitteeSession() {
  const context = useContext(CommitteeSessionProviderContext);

  if (!context) {
    throw new Error("useCommitteeSession must be used within a CommitteeSessionProvider");
  }

  const { committeeSession } = context;

  return { committeeSession };
}
