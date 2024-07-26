import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";

import { NotFoundContext } from "./NotFoundProvider";

export function NotFound() {
  const { notFound, setNotFound } = useContext(NotFoundContext);

  useEffect(() => {
    if (!notFound) {
      setNotFound(true);
    }
  }, [notFound, setNotFound]);

  return (
    <div className="app-layout">
      <nav>
        <span></span>
      </nav>

      <main>
        <article>
          <section>
            Er ging iet mis. De link die je hebt gebruikt is niet (meer) geldig. Ga naar het{" "}
            <Link to="/overview">overzicht met verkiezingen</Link>.
          </section>
        </article>
      </main>
    </div>
  );
}
