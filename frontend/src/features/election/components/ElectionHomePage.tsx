import { Link, Navigate } from "react-router";

import { PageTitle } from "@kiesraad/ui";

import { useUserRole } from "@/api";
import { Footer } from "@/components/Footer";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/lib/i18n";

export function ElectionHomePage() {
  const { isTypist } = useUserRole();
  const { election } = useElection();

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
          <ul id="election-pages">
            <li>
              {t("coordinator")}:
              <ul>
                <li>
                  <Link to={`polling-stations`}>{t("polling_station.title.plural")}</Link>
                </li>
                <li>
                  <Link to={`status`}>{t("election_status.main_title")}</Link>
                </li>
                <li>
                  <Link to={`apportionment`}>{t("apportionment.title")}</Link>
                </li>
              </ul>
            </li>
            <li>
              <Link to={`polling-stations`}>{t("polling_station.title.plural")}</Link>
            </li>
          </ul>
        </article>
      </main>
      <Footer />
    </>
  );
}
