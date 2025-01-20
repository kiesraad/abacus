import { useContext, useEffect } from "react";

import { DataEntryContext } from "./DataEntryContext";
import { DataEntryStateAndActionsLoaded, FormSectionReference } from "./types";

export function useDataEntryContext(form?: FormSectionReference): DataEntryStateAndActionsLoaded {
  const context = useContext(DataEntryContext);

  if (!context) {
    throw new Error("useDataEntryContext must be used within a DataEntryProvider");
  }

  // register the current form
  useEffect(() => {
    if (form && context.currentForm.id !== form.id) {
      context.register(form);
    }
  }, [form]);

  return context;
}
