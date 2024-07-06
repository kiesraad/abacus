import * as React from "react";
import { ElectionProviderContext } from "./ElectionProvider";

export function useElection() {
  const context = React.useContext(ElectionProviderContext);
  if (context === undefined) {
    throw new Error("useElection must be used within an ElectionProvider");
  }
  return context;
}
