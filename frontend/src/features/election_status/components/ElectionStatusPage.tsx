import { useEffect } from "react";
import { useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { useApiClient } from "@/api/useApiClient";
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
import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  CommitteeSessionStatus,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import { ElectionStatus } from "./ElectionStatus";

export function ElectionStatusPage() {
  const client = useApiClient();
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

  function handleStatusChange(status: CommitteeSessionStatus) {
    const url: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}/status`;
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: status };
    void client.putRequest(url, body).then(async () => {
      await refetch();
    });
  }

  function getLink() {
    if (committeeSession.status === "data_entry_not_started") {
      return (
        <button
          key="start"
          className="link"
          onClick={() => {
            handleStatusChange("data_entry_in_progress");
          }}
        >
          {t("election_status.start")}
        </button>
      );
    } else if (committeeSession.status === "data_entry_in_progress") {
      return (
        <button
          key="pause"
          className="link"
          onClick={() => {
            handleStatusChange("data_entry_paused");
          }}
        >
          {t("election_status.pause")}
        </button>
      );
    } else if (committeeSession.status === "data_entry_paused") {
      return (
        <button
          key="resume"
          className="link"
          onClick={() => {
            handleStatusChange("data_entry_in_progress");
          }}
        >
          {t("election_status.resume")}
        </button>
      );
    }
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
            <HeaderCommitteeSessionStatusWithIcon
              status={committeeSession.status}
              userRole="coordinator"
              committeeSessionNumber={committeeSession.number}
            />
            {isCoordinator && getLink()}
          </div>
        </section>
      </header>

      <Messages />

      {isCoordinator &&
      committeeSession.status !== "data_entry_finished" &&
      statuses.length > 0 &&
      statuses.every((s) => s.status === "definitive") ? (
        <Alert type="success">
          <h2>{t("election_status.definitive.title")}</h2>
          <p>{t("election_status.definitive.message")}</p>
          <Button onClick={finishDataEntry} size="md">
            {t("election_status.definitive.finish_button")}
          </Button>
        </Alert>
      ) : (
        isCoordinator &&
        committeeSession.status === "data_entry_paused" && (
          <Alert type="warning">
            <h2>{t("election_status.data_entry_is_paused")}</h2>
            <p>{t("election_status.paused_status_information")}</p>
            <Button
              onClick={() => {
                handleStatusChange("data_entry_in_progress");
              }}
              size="md"
            >
              {t("election_report.resume_data_entry")}
            </Button>
          </Alert>
        )
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
