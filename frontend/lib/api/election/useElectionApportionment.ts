import { useContext } from "react";

import { ElectionApportionmentProviderContext } from "./ElectionApportionmentProviderContext";

export function useElectionApportionment() {
  const context = useContext(ElectionApportionmentProviderContext);

  if (!context) {
    throw new Error("useElectionApportionment must be used within an ElectionApportionmentProvider");
  }

  return context;
}
