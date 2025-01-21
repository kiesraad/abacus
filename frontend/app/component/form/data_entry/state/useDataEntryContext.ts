import { useContext, useEffect } from "react";

import { DataEntryContext } from "./DataEntryContext";
import { DataEntryStateAndActionsLoaded, FormSectionReference } from "./types";

export function useDataEntryContext(form?: FormSectionReference): DataEntryStateAndActionsLoaded {
  const context = useContext(DataEntryContext);

  if (!context) {
    throw new Error("useDataEntryContext must be used within a DataEntryProvider");
  }

  // register the current form
  const register = context.register;
  useEffect(() => {
    if (form && context.currentForm.id !== form.id) {
      register(form);
    }
  }, [form, register]);

  return context;
}
