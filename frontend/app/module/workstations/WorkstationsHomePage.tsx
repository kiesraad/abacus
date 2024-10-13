import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { PageTitle } from "@kiesraad/ui";

export function WorkstationsHomePage() {
  return (
    <div className="app-layout">
      <NavBar>
        <Link to={"/elections#administrator"}>Verkiezingen</Link>
        <Link to={"/users#administratorcoordinator"}>Gebruikers</Link>
        <span className="active">Invoerstations</span>
        <Link to={"/logs#administratorcoordinator"}>Logs</Link>
      </NavBar>
      <PageTitle title="Invoerstations - Abacus" />
      <header>
        <section>
          <h1>Werkplekken beheren</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </div>
  );
}
