import { useContext } from "react";

import { ElectionCreateContext } from "./ElectionCreateContext";

export function useElectionCreateContext() {
  const context = useContext(ElectionCreateContext);

  if (!context) {
    throw new Error("useElectionCreateContext must be used within an ElectionCreateContextProvider");
  }

  return context;
}
