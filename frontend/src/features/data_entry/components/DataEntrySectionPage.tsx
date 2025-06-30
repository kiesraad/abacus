import { useDataEntryContext } from "../hooks/useDataEntryContext";
import { CheckAndSaveForm } from "./check_and_save/CheckAndSaveForm";
import { DataEntrySection } from "./DataEntrySection";

export function DataEntrySectionPage() {
  const { sectionId } = useDataEntryContext();

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
