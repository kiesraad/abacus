import { useNavigate } from "react-router";

import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { PollingStation } from "@/types/generated/openapi";

import { getInvestigationDeletedMessage } from "../utils/messages";
import { InvestigationReason } from "./forms/InvestigationReason";
import { InvestigationDelete } from "./InvestigationDelete";

export function InvestigationReasonPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { currentCommitteeSession, election, investigation, pollingStation, refetch } = useElection(pollingStationId);
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
      <InvestigationReason pollingStationId={pollingStationId} />
      {investigation && <InvestigationDelete pollingStation={pollingStation} onDeleted={handleDeleted} />}
    </>
  );
}
