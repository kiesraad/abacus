import { Link } from "react-router-dom";

import { MockTest } from "app/component/MockTest";
import { NavBar } from "app/component/navbar/NavBar";

import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function DevHomePage() {
  return (
    <>
      <PageTitle title="Dev Homepage - Abacus" />
      <NavBar />
      <header>
        <section>
          <h1>Abacus 🧮</h1>
        </section>
      </header>
      <main>
        <article>
          <strong>{t("user.account")}</strong>
          <ul>
            <li>
              <Link to={`/account`}>{t("user.account")}</Link>
            </li>
          </ul>
          <strong>{t("typist")}</strong>
          <ul>
            <li>
              <Link to={"/elections"}>{t("election.title.plural")}</Link>
            </li>
            <ul>
              <li>
                <Link to={`/elections/1/data-entry`}>
                  {t("data_entry.title")} {t("election.title.singular")} 1
                </Link>
              </li>
            </ul>
          </ul>
          <strong>
            {t("administrator")} / {t("coordinator")}
          </strong>
          <ul>
            <li>
              <Link to={"/elections#administrator"}>{t("election.manage")}</Link>
            </li>
            <ul>
              <li>
                <Link to={`/elections/1#coordinator`}>{t("election.title.singular")} 1</Link>
              </li>
              <li>
                <Link to={`/elections/1/polling-stations#coordinator`}>
                  {t("polling_station.title.plural")} {t("election.title.singular")} 1
                </Link>
              </li>
              <li>
                <Link to={`/elections/3/polling-stations#coordinator`}>
                  {t("polling_station.title.plural")} {t("election.title.singular")} 3 ({t("empty")})
                </Link>
              </li>
            </ul>
            <li>
              <Link to={`/users#administratorcoordinator`}>{t("user.manage")}</Link>
            </li>
            <li>
              <Link to={`/workstations#administrator`}>{t("workstations.manage")}</Link>
            </li>
            <li>
              <Link to={`/logs#administratorcoordinator`}>{t("activity_log")}</Link>
            </li>
          </ul>

          {__API_MSW__ && <MockTest />}
        </article>
      </main>
    </>
  );
}
