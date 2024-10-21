import { Link } from "react-router-dom";

import { MockTest } from "app/component/MockTest";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";

export function ElectionHomePage() {
  const { election } = useElection();

  return (
    <>
      <PageTitle title="Details verkiezing - Abacus" />
      <NavBar>
        <span>{election.name}</span>
      </NavBar>
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
      </header>
      <main>
        <article>
          <ul>
            <li>
              <Link to={`status#coordinator`}>Status</Link>
            </li>
            <li>
              <Link to={`polling-stations#coordinator`}>Stembureaus</Link>
            </li>
          </ul>
          {__API_MSW__ && <MockTest />}
        </article>
      </main>
    </>
  );
}
