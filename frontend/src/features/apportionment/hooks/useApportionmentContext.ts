import { useContext } from "react";

import { ApportionmentProviderContext } from "./ApportionmentProviderContext";

export function useApportionmentContext() {
  const context = useContext(ApportionmentProviderContext);

  if (!context) {
    throw new Error("useApportionment must be used within an ApportionmentProvider");
  }

  return context;
}
