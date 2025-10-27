import { useState } from "react";
import { useNavigate } from "react-router";

import { useCrud } from "@/api/useCrud";
import { HeaderCommitteeSessionStatusWithIcon } from "@/components/committee_session/CommitteeSessionStatus";
import { Footer } from "@/components/footer/Footer";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useLiveData } from "@/hooks/useLiveData";
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
  const navigate = useNavigate();
  const { currentCommitteeSession, election, pollingStations, refetch: refetchElection } = useElection();
  const { statuses, refetch: refetchStatuses } = useElectionStatus();
  const { isCoordinator } = useUserRole();
  const [showPauseModal, setShowPauseModal] = useState(false);
  const updatePath: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${currentCommitteeSession.id}/committee_sessions/${currentCommitteeSession.id}/status`;
  const { update } = useCrud({ updatePath, throwAllErrors: true });

  useLiveData([refetchElection, refetchStatuses]);

  function finishDataEntry() {
    void navigate("../report");
  }

  function togglePauseModal() {
    setShowPauseModal(!showPauseModal);
  }

  function handleStatusChange(status: CommitteeSessionStatus) {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: status };
    void update(body).then(() => {
      void refetchElection();
    });
  }

  function getLink() {
    if (currentCommitteeSession.status === "data_entry_not_started") {
      return (
        <Button
          key="start"
          variant="underlined"
          size="md"
          onClick={() => {
            handleStatusChange("data_entry_in_progress");
          }}
        >
          {t("election_status.start")}
        </Button>
      );
    } else if (currentCommitteeSession.status === "data_entry_in_progress") {
      return (
        <Button
          key="pause"
          variant="underlined"
          size="md"
          onClick={() => {
            togglePauseModal();
          }}
        >
          {t("election_status.pause")}
        </Button>
      );
    } else if (currentCommitteeSession.status === "data_entry_paused") {
      return (
        <Button
          key="resume"
          variant="underlined"
          size="md"
          onClick={() => {
            handleStatusChange("data_entry_in_progress");
          }}
        >
          {t("election_status.resume")}
        </Button>
      );
    }
  }

  return (
    <>
      <PageTitle title={`${t("election_status.title")} - Abacus`} />
      <header>
        <section>
          <h1>{committeeSessionLabel(currentCommitteeSession.number)}</h1>
        </section>
        <section>
          <div className="election_status">
            <HeaderCommitteeSessionStatusWithIcon
              status={currentCommitteeSession.status}
              userRole="coordinator"
              committeeSessionNumber={currentCommitteeSession.number}
            />
            {isCoordinator && getLink()}
          </div>
        </section>
      </header>

      <Messages />

      {showPauseModal && (
        <Modal title={t("election_status.pause_session")} onClose={togglePauseModal}>
          <p>{t("election_status.pause_are_you_sure")}</p>
          <nav>
            <Button
              variant="primary"
              size="xl"
              onClick={() => {
                handleStatusChange("data_entry_paused");
                togglePauseModal();
              }}
            >
              {t("election_status.pause")}
            </Button>
            <Button variant="secondary" size="xl" onClick={togglePauseModal}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}

      {isCoordinator &&
      currentCommitteeSession.status !== "data_entry_finished" &&
      statuses.length > 0 &&
      statuses.every((s) => s.status === "definitive") ? (
        <Alert type="success">
          <strong className="heading-md">{t("election_status.definitive.title")}</strong>
          <p>{t("election_status.definitive.message")}</p>
          <Button onClick={finishDataEntry} size="md">
            {t("election_status.definitive.finish_button")}
          </Button>
        </Alert>
      ) : (
        isCoordinator &&
        currentCommitteeSession.status === "data_entry_paused" && (
          <Alert type="warning">
            <strong className="heading-md">{t("election_status.data_entry_is_paused")}</strong>
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
          committeeSession={currentCommitteeSession}
          election={election}
          pollingStations={pollingStations}
          statuses={statuses}
          addLinks={
            isCoordinator &&
            (currentCommitteeSession.status === "data_entry_in_progress" ||
              currentCommitteeSession.status === "data_entry_paused")
          }
          navigate={(path) => void navigate(path)}
        />
      </main>
      <Footer />
    </>
  );
}
