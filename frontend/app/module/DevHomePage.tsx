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
              <Link to={"/elections"}>{t("election.elections")}</Link>
            </li>
            <ul>
              <li>
                <Link to={`/elections/1/data-entry`}>Verkiezing 1 invoeren</Link>
              </li>
            </ul>
          </ul>
          <strong>Beheerder / Coördinator</strong>
          <ul>
            <li>
              <Link to={"/elections#administrator"}>Verkiezingen beheren</Link>
            </li>
            <ul>
              <li>
                <Link to={`/elections/1#coordinator`}>Verkiezing 1</Link>
              </li>
              <li>
                <Link to={`/elections/1/polling-stations#coordinator`}>Stembureaus Verkiezing 1</Link>
              </li>
              <li>
                <Link to={`/elections/3/polling-stations#coordinator`}>Stembureaus Verkiezing 3 (leeg)</Link>
              </li>
            </ul>
            <li>
              <Link to={`/users#administratorcoordinator`}>Gebruikers beheren</Link>
            </li>
            <li>
              <Link to={`/workstations#administrator`}>Werkplekken beheren</Link>
            </li>
            <li>
              <Link to={`/logs#administratorcoordinator`}>Activiteitenlog</Link>
            </li>
          </ul>

          {__API_MSW__ && <MockTest />}
        </article>
      </main>
    </>
  );
}
