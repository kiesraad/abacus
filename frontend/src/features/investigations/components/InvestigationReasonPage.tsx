import { useNumericParam } from "@/hooks/useNumericParam";

import { InvestigationReason } from "./InvestigationReason";

export function InvestigationReasonPage() {
  const pollingStationId = useNumericParam("pollingStationId");

  return <InvestigationReason pollingStationId={pollingStationId} />;
}
