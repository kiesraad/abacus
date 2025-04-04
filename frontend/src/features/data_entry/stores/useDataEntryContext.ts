import { useContext, useEffect } from "react";

import { DataEntryContext } from "./DataEntryContext";
import { DataEntryStateAndActionsLoaded, FormSectionId } from "./types";

export function useDataEntryContext(formSectionId?: FormSectionId): DataEntryStateAndActionsLoaded {
  const context = useContext(DataEntryContext);

  if (!context) {
    throw new Error("useDataEntryContext must be used within a DataEntryProvider");
  }

  // register the current form
  const register = context.register;
  useEffect(() => {
    if (formSectionId && context.formState.current !== formSectionId) {
      register(formSectionId);
    }
  }, [formSectionId, context.formState, register]);

  return context;
}
