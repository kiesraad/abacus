import { useContext, useEffect } from "react";

import { FormSectionId } from "@/types/types";

import { DataEntryStateAndActionsLoaded } from "../types/types";
import { DataEntryContext } from "./DataEntryContext";

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
