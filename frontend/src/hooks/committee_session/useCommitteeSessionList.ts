import { useContext } from "react";

import { CommitteeSessionListProviderContext } from "./CommitteeSessionListProviderContext";

// fetch the committee session list from the context
export function useCommitteeSessionList() {
  const context = useContext(CommitteeSessionListProviderContext);

  if (!context) {
    throw new Error("useCommitteeSessionList must be used within a CommitteeSessionListProvider");
  }

  const { committeeSessions } = context;

  return { committeeSessions };
}
