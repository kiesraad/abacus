import { Navigate } from "react-router";

import { CommitteeSessionCard } from "@/components/committee_session/CommitteeSessionCard";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { useCommitteeSessionList } from "@/hooks/committee_session/useCommitteeSessionList";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";

import { ElectionInformationTable } from "./ElectionInformationTable";
import cls from "./ElectionManagement.module.css";

export function ElectionHomePage() {
  const { isTypist } = useUserRole();
  const { committeeSessions } = useCommitteeSessionList();
  const { election, pollingStations } = useElection();

  if (isTypist) {
    return <Navigate to="data-entry" />;
  }

  return (
    <>
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
          <div className="mb-xl">
            {committeeSessions.map((committeeSession) => (
              <CommitteeSessionCard key={committeeSession.id} committeeSession={committeeSession} />
            ))}
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
    </>
  );
}
