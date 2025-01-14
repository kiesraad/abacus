import { useContext } from "react";
import { DataEntryContext } from "./DataEntryProvider";

export function useDataEntryContext() {
  const context = useContext(DataEntryContext);

  if (!context) {
    throw new Error("useDataEntryContext must be used within a DataEntryProvider");
  }

  return context;
}
