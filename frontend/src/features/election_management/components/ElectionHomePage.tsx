import { useEffect } from "react";
import { Link, Navigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Table } from "@/components/ui/Table/Table";
import { CommitteeSessionListProvider } from "@/hooks/committee_session/CommitteeSessionListProvider";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";

import { directDownload } from "../utils/download";
import { CommitteeSessionCards } from "./CommitteeSessionCards";
import { ElectionInformationTable } from "./ElectionInformationTable";
import cls from "./ElectionManagement.module.css";

export function ElectionHomePage() {
  const { isTypist } = useUserRole();
  const { committeeSession, election, pollingStations, refetch } = useElection();

  // re-fetch election when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetch(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetch]);

  if (isTypist) {
    return <Navigate to="data-entry" />;
  }

  return (
    <CommitteeSessionListProvider electionId={election.id}>
      <PageTitle title={`${t("election.title.details")} - Abacus`} />
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
      </header>
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
          <div id="committee-session-cards" className={cn(cls.cards, "mb-xl")}>
            <CommitteeSessionCards />
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
          <div className="mb-xl">
            <h3 className={cls.tableTitle}>{t("election_management.empty_models")}</h3>
            <section className="md">
              <p>{t("election_management.empty_models_description")}</p>
            </section>
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
    </CommitteeSessionListProvider>
  );
}
