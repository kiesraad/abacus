import { Link } from "react-router-dom";

import { PageTitle } from "@kiesraad/ui";

export function UserHomePage() {
  return (
    <>
      <PageTitle title="Account - Abacus" />
      <header>
        <section>
          <h1>Account</h1>
        </section>
      </header>
      <main>
        <article>
          <ul>
            <li>
              <Link to={`login`}>Inloggen</Link>
            </li>
          </ul>
        </article>
      </main>
    </>
  );
}
