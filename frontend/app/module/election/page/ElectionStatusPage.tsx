import { NavBar } from "app/component/navbar/NavBar";

import { useElection } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";

export function ElectionStatusPage() {
  const { election } = useElection();

  return (
    <div className="app-layout">
      <NavBar>
        <span>{election.name}</span>
      </NavBar>
      <PageTitle title="Status verkiezing - Abacus" />
      <header>
        <section>
          <h1>Eerste zitting</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </div>
  );
}
