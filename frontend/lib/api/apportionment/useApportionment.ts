import { useContext } from "react";

import { ApportionmentProviderContext } from "./ApportionmentProviderContext";

export function useApportionment() {
  const context = useContext(ApportionmentProviderContext);

  if (!context) {
    throw new Error("useApportionment must be used within an ApportionmentProvider");
  }

  return context;
}
