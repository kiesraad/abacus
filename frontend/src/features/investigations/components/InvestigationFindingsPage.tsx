import { useNumericParam } from "@/hooks/useNumericParam";

import { InvestigationFindings } from "./InvestigationFindings";

export function InvestigationFindingsPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  return <InvestigationFindings pollingStationId={pollingStationId} />;
}
