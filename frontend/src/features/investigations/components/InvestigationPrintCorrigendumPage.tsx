import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";

import { InvestigationPrintCorrigendum } from "./InvestigationPrintCorrigendum";

export function InvestigationPrintCorrigendumPage() {
  const pollingStationId = useNumericParam("pollingStationId");

  const { election, pollingStation } = useElection(pollingStationId);

  if (!pollingStation) {
    return <Loader />;
  }

  return (
    <InvestigationPrintCorrigendum
      electionId={election.id}
      pollingStationId={pollingStation.id}
      pollingStationNumber={pollingStation.number}
    />
  );
}
