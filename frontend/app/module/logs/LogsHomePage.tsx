import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function LogsHomePage() {
  return (
    <>
      <PageTitle title="Activiteitenlog - Abacus" />
      <NavBar>
        <Link to={"/elections#administrator"}>{t("election.name_plural")}</Link>
        <Link to={"/users#administratorcoordinator"}>{t("users")}</Link>
        <Link to={"/workstations#administrator"}>{t("data_entry_stations")}</Link>
        <span className="active">{t("logs")}</span>
      </NavBar>
      <header>
        <section>
          <h1>{t("activity_log")}</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </>
  );
}
