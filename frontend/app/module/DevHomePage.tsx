import { Link } from "react-router-dom";

import { MockTest } from "app/component/MockTest";
import { NavBar } from "app/component/navbar/NavBar";

import { PageTitle } from "@kiesraad/ui";

export function DevHomePage() {
  return (
    <>
      <PageTitle title="Dev Homepage - Abacus" />
      <NavBar />
      <header>
        <section>
          <h1>Abacus 🧮</h1>
        </section>
      </header>
      <main>
        <article>
          <strong>Account</strong>
          <ul>
            <li>
              <Link to={`/account`}>Account</Link>
            </li>
          </ul>
          <strong>Invoerder</strong>
          <ul>
            <li>
              <Link to={"/elections"}>Verkiezingen</Link>
            </li>
            <ul>
              <li>
                <Link to={`/elections/1/data-entry`}>Verkiezing 1 invoeren</Link>
              </li>
            </ul>
          </ul>
          <strong>Beheerder / Coördinator</strong>
          <ul>
            <li>
              <Link to={"/elections#administrator"}>Verkiezingen beheren</Link>
            </li>
            <ul>
              <li>
                <Link to={`/elections/1#coordinator`}>Verkiezing 1</Link>
              </li>
              <li>
                <Link to={`/elections/1/polling-stations#coordinator`}>Verkiezing 1 stembureaus</Link>
              </li>
            </ul>
            <li>
              <Link to={`/users#administratorcoordinator`}>Gebruikers beheren</Link>
            </li>
            <li>
              <Link to={`/workstations#administrator`}>Werkplekken beheren</Link>
            </li>
            <li>
              <Link to={`/logs#administratorcoordinator`}>Activiteitenlog</Link>
            </li>
          </ul>

          {__API_MSW__ && <MockTest />}
        </article>
      </main>
    </>
  );
}
