import { useParams } from "react-router";

import { FormSectionId } from "@/types/types";

import { CheckAndSaveForm } from "./check_and_save/CheckAndSaveForm";
import { DataEntrySection } from "./DataEntrySection";

export function DataEntrySectionPage() {
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;

  // Handle index route case (no sectionId) - navigation logic will redirect
  if (!sectionId) {
    return null;
  }

  if (sectionId === "save") {
    return <CheckAndSaveForm />;
  } else {
    return <DataEntrySection key={sectionId} />;
  }
}
