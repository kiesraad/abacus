import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Modal } from "@/components/ui/Modal/Modal";
import { Table } from "@/components/ui/Table/Table";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_CREATE_REQUEST_BODY,
  COMMITTEE_SESSION_CREATE_REQUEST_PATH,
  CommitteeSession,
  ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PATH,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";

import { directDownload } from "../utils/download";
import { CommitteeSessionCard } from "./CommitteeSessionCard";
import { ElectionInformationTable } from "./ElectionInformationTable";
import cls from "./ElectionManagement.module.css";

export function ElectionHomePage() {
  const client = useApiClient();
  const { committeeSession, election, pollingStations, refetch: refetchElection } = useElection();
  const { requestState: getCommitteeSessions, refetch: refetchCommitteeSessions } = useInitialApiGet<{
    committee_sessions: CommitteeSession[];
  }>(`/api/elections/${election.id}/committee_sessions` satisfies ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PATH);
  const { isTypist, isCoordinator } = useUserRole();
  const [showAddCommitteeSessionModal, setShowAddCommitteeSessionModal] = useState(false);
  const [createCommitteeSessionError, setCreateCommitteeSessionError] = useState<AnyApiError | null>(null);

  if (createCommitteeSessionError) {
    throw createCommitteeSessionError;
  }

  // re-fetch election when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetchElection(abortController);
    void refetchCommitteeSessions(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetchElection, refetchCommitteeSessions]);

  if (getCommitteeSessions.status === "api-error") {
    throw getCommitteeSessions.error;
  }

  if (getCommitteeSessions.status === "loading") {
    return <Loader />;
  }

  const committeeSessions = getCommitteeSessions.data.committee_sessions;

  if (isTypist) {
    return <Navigate to="data-entry" />;
  }

  function toggleAddCommitteeSessionModal() {
    setShowAddCommitteeSessionModal(!showAddCommitteeSessionModal);
  }

  function handleCommitteeSessionCreate() {
    const url: COMMITTEE_SESSION_CREATE_REQUEST_PATH = `/api/committee_sessions`;
    const body: COMMITTEE_SESSION_CREATE_REQUEST_BODY = { election_id: election.id };
    void client
      .postRequest(url, body)
      .then(async (result) => {
        if (isSuccess(result)) {
          await refetchCommitteeSessions();
        } else {
          throw result;
        }
      })
      .catch(setCreateCommitteeSessionError);
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
                {t("GSB")} {election.domain_id} {election.location}
              </h2>
            </div>
          </div>
          <div id="committee-sessions" className={cn(cls.sessions, "mb-xl")}>
            <div id="committee-session-cards" className={cls.cards}>
              {committeeSessions.map((committeeSession, index) => (
                <CommitteeSessionCard
                  key={committeeSession.id}
                  committeeSession={committeeSession}
                  currentSession={index === 0}
                />
              ))}
            </div>
            {isCoordinator && committeeSession.status === "data_entry_finished" && (
              <Button variant="secondary" size="sm" onClick={toggleAddCommitteeSessionModal}>
                {t("election_management.prepare_new_session")}
              </Button>
            )}
          </div>
          <div className={cn(cls.line, "mb-xl")}></div>
          <div className="mb-xl">
            <h3 className={cls.tableTitle}>{t("election_management.about_this_election")}</h3>
            <ElectionInformationTable
              election={election}
              numberOfPollingStations={pollingStations.length}
              numberOfVoters={committeeSession.number_of_voters}
            />
          </div>
          <div className={cls.downloadModels}>
            <h3 className={cls.tableTitle}>{t("election_management.empty_models")}</h3>
            <p>{t("election_management.empty_models_description")}</p>
            <Table className={cn(cls.electionInformationTable)}>
              <Table.Header>
                <Table.HeaderCell scope="col">{t("election_management.model_name")}</Table.HeaderCell>
                <Table.HeaderCell scope="col">{t("election_management.model_purpose")}</Table.HeaderCell>
              </Table.Header>
              <Table.Body>
                <Table.ClickRow
                  onClick={() => {
                    directDownload(`/api/elections/${election.id}/download_na_31_2_bijlage1`);
                  }}
                >
                  <Table.Cell>Na 31-2 Bijlage 1</Table.Cell>
                  <Table.Cell>{t("election_management.na_31_2_bijlage_1")}</Table.Cell>
                </Table.ClickRow>
                <Table.ClickRow
                  onClick={() => {
                    directDownload(`/api/elections/${election.id}/download_n_10_2`);
                  }}
                >
                  <Table.Cell>N 10-2</Table.Cell>
                  <Table.Cell>{t("election_management.n_10_2")}</Table.Cell>
                </Table.ClickRow>
              </Table.Body>
            </Table>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
