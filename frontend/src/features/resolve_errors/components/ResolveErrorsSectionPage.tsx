import { useParams } from "react-router";

import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import { ReadOnlyDataEntrySection } from "./ReadOnlyDataEntrySection";

export function ResolveErrorsSectionPage() {
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId;
  const pollingStationId = useNumericParam("pollingStationId");
  const { committeeSession, election } = useElection(pollingStationId);
  const { loading, dataEntry } = usePollingStationDataEntryErrors(pollingStationId);

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "data_entry_in_progress" && committeeSession.status !== "data_entry_paused") {
    throw new Error(t("error.api_error.CommitteeSessionNotInProgress"));
  }

  if (loading || dataEntry === null) {
    return <Loader />;
  }

  const structure = getDataEntryStructure(election, dataEntry.finalised_first_entry);
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
