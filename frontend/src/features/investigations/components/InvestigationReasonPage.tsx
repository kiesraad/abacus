import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";

import { InvestigationReason } from "./InvestigationReason";

export function InvestigationReasonPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { investigation } = useElection(pollingStationId);

  return <InvestigationReason pollingStationId={pollingStationId} investigation={investigation} />;
}
