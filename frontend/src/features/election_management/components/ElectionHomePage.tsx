import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { useCrud } from "@/api/useCrud";
import { Footer } from "@/components/footer/Footer";
import { IconTrash } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Table } from "@/components/ui/Table/Table";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_CREATE_REQUEST_PATH,
  COMMITTEE_SESSION_DELETE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { hasBooleanProperty } from "@/utils/typeChecks";

import { directDownload } from "../utils/download";
import { CommitteeSessionCard } from "./CommitteeSessionCard";
import { ElectionInformationTable } from "./ElectionInformationTable";
import cls from "./ElectionManagement.module.css";

export function ElectionHomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCommitteeSession, committeeSessions, election, investigations, pollingStations, refetch } =
    useElection();
  const { isCoordinator } = useUserRole();
  const [showAddCommitteeSessionModal, setShowAddCommitteeSessionModal] = useState(false);
  const isFirstCommitteeSession = currentCommitteeSession.number === 1;
  const createPath: COMMITTEE_SESSION_CREATE_REQUEST_PATH = `/api/elections/${election.id}/committee_sessions`;
  const removePath: COMMITTEE_SESSION_DELETE_REQUEST_PATH = `/api/elections/${currentCommitteeSession.election_id}/committee_sessions/${currentCommitteeSession.id}`;
  const { create, remove } = useCrud({ createPath, removePath, throwAllErrors: true });
  const showDeleteModal = hasBooleanProperty(location.state, "showDeleteModal") && location.state.showDeleteModal;

  // re-fetch election when component mounts
  useEffect(() => {
    const abortController = new AbortController();
    void refetch(abortController);
    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetch]);

  function toggleAddCommitteeSessionModal() {
    setShowAddCommitteeSessionModal(!showAddCommitteeSessionModal);
  }

  function handleCommitteeSessionCreate() {
    void create({}).then(() => {
      void refetch();
    });
  }

  function handleCommitteeSessionDelete() {
    void remove().then(() => {
      void refetch();
    });
  }

  function toggleDeleteCommitteeSessionModal() {
    void navigate(".", { replace: true });
  }

  return (
    <>
      <PageTitle title={`${t("election.title.details")} - Abacus`} />
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
      </header>
      {showAddCommitteeSessionModal && (
        <Modal title={t("election_management.investigation_ordered_by_csb")} onClose={toggleAddCommitteeSessionModal}>
          <p>{t("election_management.only_add_if_ordered")}</p>
          <p>{t("election_management.if_gsb_correction")}</p>
          <nav>
            <Button
              variant="primary"
              size="xl"
              onClick={() => {
                handleCommitteeSessionCreate();
                toggleAddCommitteeSessionModal();
              }}
            >
              {t("election_management.yes_add_session")}
            </Button>
            <Button variant="secondary" onClick={toggleAddCommitteeSessionModal}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
      {showDeleteModal && investigations.length === 0 && (
        <Modal title={`${t("election_management.delete_session")}?`} onClose={toggleDeleteCommitteeSessionModal}>
          <p>
            {t("election_management.delete_session_are_you_sure", {
              sessionLabel: committeeSessionLabel(currentCommitteeSession.number, true).toLowerCase(),
            })}
          </p>
          <nav>
            <Button
              leftIcon={<IconTrash />}
              variant="primary-destructive"
              size="xl"
              onClick={() => {
                handleCommitteeSessionDelete();
                toggleDeleteCommitteeSessionModal();
              }}
            >
              {t("election_management.yes_delete_session")}
            </Button>
            <Button variant="secondary" onClick={toggleDeleteCommitteeSessionModal}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
      {showDeleteModal && investigations.length > 0 && (
        <Modal title={t("election_management.delete_investigations_first")} onClose={toggleDeleteCommitteeSessionModal}>
          <p>
            {t("election_management.delete_investigations_first_are_you_sure", {
              sessionLabel: committeeSessionLabel(currentCommitteeSession.number, true).toLowerCase(),
            })}
          </p>
          <nav>
            <Button variant="primary" size="xl" onClick={() => void navigate("investigations")}>
              {t("election_management.view_investigations")}
            </Button>
            <Button variant="secondary" onClick={toggleDeleteCommitteeSessionModal}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
      {pollingStations.length === 0 && (
        <Alert type="warning">
          <strong className="heading-md" id="noPollingStationsWarningAlertTitle">
            {t("election_management.no_polling_stations")}
          </strong>
          <p id="noPollingStationsWarningAlertDescription">{t("election_management.add_polling_stations_first")}</p>
          <p>
            <Link to="polling-stations">{t("polling_station.manage")}</Link> →
          </p>
        </Alert>
      )}
      <main className={cls.electionHome}>
        <article>
          <div className="mb-xl">
            <div>
              <h2>
                {/* TODO: Change to conditional GSB/HSB/CSB when implemented */}
                {t("GSB")} {election.location}
              </h2>
            </div>
          </div>
          <div id="committee-sessions" className={cn(cls.sessions, "mb-xl")}>
            <div id="committee-session-cards" className={cls.cards}>
              {committeeSessions.map((committeeSession, index) => (
                <CommitteeSessionCard
                  key={committeeSession.id}
                  committeeSession={committeeSession}
                  isCurrentSession={index === 0}
                />
              ))}
            </div>
            {isCoordinator && currentCommitteeSession.status === "data_entry_finished" && (
              <Button variant="secondary" size="sm" onClick={toggleAddCommitteeSessionModal}>
                {t("election_management.prepare_new_session")}
              </Button>
            )}
          </div>
          <div className={cn(cls.line, "mb-xl")}></div>
          <div>
            <h3 className={cls.tableTitle}>{t("election_management.about_this_election")}</h3>
            <ElectionInformationTable
              election={election}
              numberOfPollingStations={pollingStations.length}
              numberOfVoters={currentCommitteeSession.number_of_voters}
            />
          </div>
          {isFirstCommitteeSession && (
            <div className={cn(cls.downloadModels, "mt-xl")}>
              <h3 className={cls.tableTitle}>{t("election_management.empty_documents_title")}</h3>
              <p>{t("election_management.empty_documents_description")}</p>
              <Table className={cn(cls.electionInformationTable)} variant="information">
                <Table.Header>
                  <Table.HeaderCell scope="col">{t("election_management.document_model")}</Table.HeaderCell>
                  <Table.HeaderCell scope="col">{t("election_management.document_purpose")}</Table.HeaderCell>
                </Table.Header>
                <Table.Body>
                  <Table.ClickRow
                    onClick={() => {
                      directDownload(`/api/elections/${election.id}/download_na_31_2_bijlage1`);
                    }}
                  >
                    <Table.Cell>Na 31-2 Bijlage 1</Table.Cell>
                    <Table.Cell>{t("election_management.document_na_31_2_bijlage_1")}</Table.Cell>
                  </Table.ClickRow>
                  <Table.ClickRow
                    onClick={() => {
                      directDownload(`/api/elections/${election.id}/download_n_10_2`);
                    }}
                  >
                    <Table.Cell>N 10-2</Table.Cell>
                    <Table.Cell>{t("election_management.document_n_10_2")}</Table.Cell>
                  </Table.ClickRow>
                </Table.Body>
              </Table>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
