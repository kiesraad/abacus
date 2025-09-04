import { useParams } from "react-router";

import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import { ReadOnlyDataEntrySection } from "./ReadOnlyDataEntrySection";

export function ResolveErrorsSectionPage() {
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId;
  const pollingStationId = useNumericParam("pollingStationId");
  const { election } = useElection(pollingStationId);
  const { loading, dataEntry } = usePollingStationDataEntryErrors(pollingStationId);

  if (loading || dataEntry === null) {
    return <Loader />;
  }

  const model = dataEntry.finalised_first_entry.model;
  const structure = getDataEntryStructure(model, election);
  const section = structure.find((s) => s.id === sectionId);

  if (!section) {
    throw new Error(`Section with id ${sectionId} not found`);
  }

  return (
    <ReadOnlyDataEntrySection
      section={section}
      data={dataEntry.finalised_first_entry}
      validationResults={dataEntry.validation_results}
    />
  );
}
