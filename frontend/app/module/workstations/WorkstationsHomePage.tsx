import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function WorkstationsHomePage() {
  return (
    <>
      <PageTitle title="Invoerstations - Abacus" />
      <NavBar>
        <Link to={"/elections#administrator"}>{t("election.name_plural")}</Link>
        <Link to={"/users#administratorcoordinator"}>{t("users")}</Link>
        <span className="active">{t("polling_stations")}</span>
        <Link to={"/logs#administratorcoordinator"}>{t("logs")}</Link>
      </NavBar>
      <header>
        <section>
          <h1>{t("workstations.manage")}</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </>
  );
}
