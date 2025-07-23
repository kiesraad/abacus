import { useEffect } from "react";
import { useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { HeaderCommitteeSessionStatusWithIcon } from "@/components/committee_session/CommitteeSessionStatus";
import { Footer } from "@/components/footer/Footer";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { committeeSessionLabel } from "@/utils/committeeSession";

import { ElectionStatus } from "./ElectionStatus";

export function ElectionStatusPage() {
  const navigate = useNavigate();
  const { committeeSession, election, pollingStations, refetch } = useElection();
  const { statuses } = useElectionStatus();
  const { isCoordinator } = useUserRole();

  // re-fetch election when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetch(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetch]);

  function finishDataEntry() {
    void navigate("../report");
  }

  return (
    <>
      <PageTitle title={`${t("election_status.title")} - Abacus`} />
      <header>
        <section>
          <h1>{committeeSessionLabel(committeeSession.number)}</h1>
        </section>
        <section>
          <div className="election_status">
            <HeaderCommitteeSessionStatusWithIcon status={committeeSession.status} userRole="coordinator" />
          </div>
        </section>
      </header>

      <Messages />

      {committeeSession.status !== "data_entry_finished" &&
        statuses.length > 0 &&
        statuses.every((s) => s.status === "definitive") && (
          <Alert type="success">
            <h2>{t("election_status.definitive.title")}</h2>
            <p>{t("election_status.definitive.message")}</p>
            <Button onClick={finishDataEntry} size="md">
              {t("election_status.definitive.finish_button")}
            </Button>
          </Alert>
        )}

      <main>
        <ElectionStatus
          election={election}
          pollingStations={pollingStations}
          statuses={statuses}
          addLinks={
            isCoordinator &&
            (committeeSession.status === "data_entry_in_progress" || committeeSession.status === "data_entry_paused")
          }
          navigate={(path) => void navigate(path)}
        />
      </main>
      <Footer />
    </>
  );
}
