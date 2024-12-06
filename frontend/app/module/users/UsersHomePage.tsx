import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function UsersHomePage() {
  return (
    <>
      <PageTitle title={`${t("user.management")} - Abacus`} />
      <NavBar>
        <Link to={"/elections#administrator"}>{t("election.title.plural")}</Link>
        <span className="active">{t("users")}</span>
        <Link to={"/workstations#administrator"}>{t("workstations.workstations")}</Link>
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
