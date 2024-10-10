import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

export function NotFound() {
  return (
    <div className="app-layout">
      <NavBar>
        <span>
          <Link to={"/elections"}>Overzicht</Link>
        </span>
      </NavBar>

      <main>
        <article>
          <section>
            Er ging iets mis. De link die je hebt gebruikt is niet (meer) geldig. Ga naar het{" "}
            <Link to="/elections">overzicht met verkiezingen</Link>.
          </section>
        </article>
      </main>
    </div>
  );
}
