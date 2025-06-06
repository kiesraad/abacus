import { Link, Navigate } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";

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
