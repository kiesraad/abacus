import { Link, Navigate } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";

import { ElectionInformationTable } from "./ElectionInformationTable";
import cls from "./ElectionManagement.module.css";

export function ElectionHomePage() {
  const { isTypist } = useUserRole();
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
      <main>
        <article>
          <div className="mb-lg">
            <div>
              <h2 className={cls.tableTitle}>{t("election_management.about_this_election")}</h2>
              <ElectionInformationTable election={election} numberOfPollingStations={pollingStations.length} />
            </div>
          </div>
          <ul id="election-pages">
            <li>
              {t("coordinator")}:
              <ul>
                <li>
                  <Link to={`status`}>{t("election_status.main_title")}</Link>
                </li>
                <li>
                  <Link to={`apportionment`}>{t("apportionment.title")}</Link>
                </li>
              </ul>
            </li>
          </ul>
        </article>
      </main>
      <Footer />
    </>
  );
}
