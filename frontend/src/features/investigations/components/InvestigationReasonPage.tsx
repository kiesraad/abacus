import { useNavigate } from "react-router";

import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

import { InvestigationReason } from "./forms/InvestigationReason";
import { InvestigationDelete } from "./InvestigationDelete";

export function InvestigationReasonPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { election, investigation, pollingStation } = useElection(pollingStationId);
  const navigate = useNavigate();
  const { pushMessage } = useMessages();

  if (!pollingStation) {
    return <Loader />;
  }

  function handleDeleted(pollingStation: PollingStation) {
    pushMessage({
      title: t("investigations.message.investigation_deleted", {
        number: pollingStation.number,
        name: pollingStation.name,
      }),
    });

    void navigate(`/elections/${election.id}/investigations`);
  }

  return (
    <>
      <InvestigationReason pollingStationId={pollingStationId} />
      {investigation && <InvestigationDelete pollingStation={pollingStation} onDeleted={handleDeleted} />}
    </>
  );
}
