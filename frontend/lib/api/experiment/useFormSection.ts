import * as React from "react";

import { FormSections } from "./DataEntryController";
import { DataEntryControllerContext } from "./DataEntryControllerContext";

export interface UseFormSectionReturn<T> {
  section: T;
  state: any;
}

export function useFormSection<T extends keyof FormSections>(id: T): UseFormSectionReturn<FormSections[T]> {
  const context = React.useContext(DataEntryControllerContext);
  if (!context) {
    throw new Error("useFormSection must be used within a DataEntryControllerProvider");
  }

  return { section: context.controller.sections[id], state: context.controller.state.sections[id] };
}
