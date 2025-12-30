import { useNavigate } from "react-router";

import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import type { PollingStation } from "@/types/generated/openapi";

import { getInvestigationDeletedMessage } from "../utils/messages";
import { InvestigationPrintCorrigendum } from "./forms/InvestigationPrintCorrigendum";
import { InvestigationDelete } from "./InvestigationDelete";

export function InvestigationPrintCorrigendumPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { currentCommitteeSession, election, pollingStation, refetch } = useElection(pollingStationId);
  const navigate = useNavigate();
  const { pushMessage } = useMessages();

  if (!pollingStation) {
    return <Loader />;
  }

  function handleDeleted(pollingStation: PollingStation) {
    pushMessage(getInvestigationDeletedMessage(pollingStation, currentCommitteeSession.status));
    void refetch();
    void navigate(`/elections/${election.id}/investigations`, { replace: true });
  }

  return (
    <>
      <InvestigationPrintCorrigendum pollingStationId={pollingStationId} />
      <InvestigationDelete pollingStation={pollingStation} onDeleted={handleDeleted} />
    </>
  );
}
