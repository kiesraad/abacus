import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { PageTitle } from "@kiesraad/ui";

export function UsersHomePage() {
  return (
    <>
      <PageTitle title="Gebruikersbeheer - Abacus" />
      <NavBar>
        <Link to={"/elections#administrator"}>Verkiezingen</Link>
        <span className="active">Gebruikers</span>
        <Link to={"/workstations#administrator"}>Invoerstations</Link>
        <Link to={"/logs#administratorcoordinator"}>Logs</Link>
      </NavBar>
      <header>
        <section>
          <h1>Gebruikers beheren</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </>
  );
}
