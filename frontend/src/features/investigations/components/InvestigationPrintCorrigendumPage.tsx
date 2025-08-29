import { useNumericParam } from "@/hooks/useNumericParam";

import { InvestigationPrintCorrigendum } from "./InvestigationPrintCorrigendum";

export function InvestigationPrintCorrigendumPage() {
  const electionId = useNumericParam("electionId");
  const pollingStationId = useNumericParam("pollingStationId");

  return <InvestigationPrintCorrigendum electionId={electionId} pollingStationId={pollingStationId} />;
}
