import { PageTitle } from "@kiesraad/ui";
import { NavBar } from "app/component/navbar/NavBar";
import { Link } from "react-router-dom";

export function LogsHomePage() {
  return (
    <div className="app-layout">
      <NavBar>
        <Link to={"/elections#administrator"}>Verkiezingen</Link>
        <Link to={"/users#administrator"}>Gebruikers</Link>
        <Link to={"/workstations#administrator"}>Invoerstations</Link>
        <span className="active">Logs</span>
      </NavBar>
      <PageTitle title="Activiteitenlog - Abacus" />
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
    </div>
  );
}
