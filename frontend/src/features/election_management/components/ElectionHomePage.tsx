import { useEffect } from "react";
import { Link, Navigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { CommitteeSessionListProvider } from "@/hooks/committee_session/CommitteeSessionListProvider";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";

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
          <h2 id="noPollingStationsWarningAlertTitle">{t("election_management.no_polling_stations")}</h2>
          <p id="noPollingStationsWarningAlertDescription">{t("election_management.add_polling_stations_first")}</p>
          <p>
            <Link to="polling-stations">{t("election_management.manage_polling_stations")}</Link> →
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
            <div>
              <h3 className={cn(cls.tableTitle, "heading-lg")}>{t("election_management.about_this_election")}</h3>
              <ElectionInformationTable
                election={election}
                numberOfPollingStations={pollingStations.length}
                numberOfVoters={committeeSession.number_of_voters}
              />
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </CommitteeSessionListProvider>
  );
}
