import { useNavigate } from "react-router";

import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

import { InvestigationFindings } from "./forms/InvestigationFindings";
import { InvestigationDelete } from "./InvestigationDelete";

export function InvestigationFindingsPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { currentCommitteeSession, election, pollingStation, refetch } = useElection(pollingStationId);
  const navigate = useNavigate();
  const { pushMessage } = useMessages();

  if (!pollingStation) {
    return <Loader />;
  }

  function handleDeleted(pollingStation: PollingStation) {
    if (currentCommitteeSession.status === "data_entry_finished") {
      pushMessage({
        type: "warning",
        title: t("generate_new_results"),
        text: `${t("investigations.message.investigation_deleted", {
          number: pollingStation.number,
          name: pollingStation.name,
        })}. ${t("documents_are_invalidated")}`,
      });
    } else {
      pushMessage({
        title: t("investigations.message.investigation_deleted", {
          number: pollingStation.number,
          name: pollingStation.name,
        }),
      });
    }
    void refetch();
    void navigate(`/elections/${election.id}/investigations`, { replace: true });
  }

  return (
    <>
      <InvestigationFindings pollingStationId={pollingStationId} />
      <InvestigationDelete pollingStation={pollingStation} onDeleted={handleDeleted} />
    </>
  );
}
