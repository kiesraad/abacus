import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

export function NotAvailableInMock() {
  return (
    <>
      <NavBar>
        <Link to={"/overview"}>Overzicht</Link>
      </NavBar>

      <main>
        <article>
          Deze pagina is helaas niet beschikbaar in deze demo-versie. Ga naar het{" "}
          <a href={"/overview"}>overzicht met verkiezingen</a> om andere functionaliteit uit te proberen.
        </article>
      </main>
    </>
  );
}
