import { PageTitle } from "@kiesraad/ui";
import { NavBar } from "app/component/navbar/NavBar";
import { Link } from "react-router-dom";

export function LogsHomePage() {
  return (
    <>
      <PageTitle title="Activiteitenlog - Abacus" />
      <NavBar>
        <Link to={"/elections#administrator"}>Verkiezingen</Link>
        <Link to={"/users#administratorcoordinator"}>Gebruikers</Link>
        <Link to={"/workstations#administrator"}>Invoerstations</Link>
        <span className="active">Logs</span>
      </NavBar>
      <header>
        <section>
          <h1>Activiteitenlog</h1>
        </section>
      </header>
      <main>
        <article>
          Placeholder
        </article>
      </main>
    </>
  );
}
