import { useParams } from "react-router";

import { useDataEntryContext } from "@/features/data_entry/hooks/useDataEntryContext";
import { FormSectionId } from "@/types/types";

import { DataEntrySection } from "./DataEntrySection";

export function DataEntrySectionPage() {
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId;

  if (!sectionId) {
    throw new Error("No section id given");
  }

  // Register current section, wait for update
  const { formState } = useDataEntryContext(sectionId);
  if (formState.current !== sectionId) {
    return null;
  }

  return <DataEntrySection />;
}
