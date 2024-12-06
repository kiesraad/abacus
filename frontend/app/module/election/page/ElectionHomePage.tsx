import { Link } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";
import { MockTest } from "app/component/MockTest";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function ElectionHomePage() {
  const { election } = useElection();

  return (
    <>
      <PageTitle title={`${t("election.title.details")} - Abacus`} />
      <NavBar>
        <span>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </span>
      </NavBar>
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
      </header>
      <main>
        <article>
          <ul>
            <li>
              {t("coordinator")}:
              <ul>
                <li>
                  <Link to={`status#coordinator`}>{t("election.status")}</Link>
                </li>
                <li>
                  <Link to={`polling-stations#coordinator`}>{t("election.polling_stations")}</Link>
                </li>
              </ul>
            </li>
            <li>
              Invoerder:
              <ul>
                <li>
                  <Link to={`data-entry`}>{t("data_entry.title")}</Link>
                </li>
              </ul>
            </li>
          </ul>
          {__API_MSW__ && <MockTest />}
        </article>
      </main>
      <Footer />
    </>
  );
}
