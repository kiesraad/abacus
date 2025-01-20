import { useContext, useEffect } from "react";

import { DataEntryContext } from "./DataEntryContext";
import { FormSectionReference } from "./types";

export function useDataEntryContext(form: FormSectionReference) {
  const context = useContext(DataEntryContext);

  if (!context) {
    throw new Error("useDataEntryContext must be used within a DataEntryProvider");
  }

  // register the current form
  useEffect(() => {
    context.dispatch({
      type: "REGISTER_CURRENT_FORM",
      form,
    });
  }, []);

  return context;
}
