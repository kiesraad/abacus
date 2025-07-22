import { useEffect } from "react";
import { Navigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
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
  const { election, pollingStations, refetch } = useElection();

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
      <main className={cls.electionHome}>
        <article>
          <div className="mb-xl">
            <div>
              <h2>
                {election.domain_id} {election.location}
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
              <ElectionInformationTable election={election} numberOfPollingStations={pollingStations.length} />
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </CommitteeSessionListProvider>
  );
}
