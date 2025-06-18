import { useParams } from "react-router";

import { FormSectionId } from "@/types/types";

import { DataEntrySection } from "./DataEntrySection";

export function DataEntrySectionWrapper() {
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId;

  if (!sectionId) {
    throw new Error("No section id given");
  }

  return <DataEntrySection sectionId={sectionId} />;
}
