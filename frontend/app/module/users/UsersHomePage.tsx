import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function UsersHomePage() {
  return (
    <>
      <PageTitle title="Gebruikersbeheer - Abacus" />
      <NavBar>
        <Link to={"/elections#administrator"}>{t("election.name_plural")}</Link>
        <span className="active">{t("users")}</span>
        <Link to={"/workstations#administrator"}>{t("polling_stations")}</Link>
        <Link to={"/logs#administratorcoordinator"}>{t("logs")}</Link>
      </NavBar>
      <header>
        <section>
          <h1>{t("user.manage")}</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </>
  );
}
