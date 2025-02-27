import { Link, Navigate } from "react-router";

import { useUser } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function UserHomePage() {
  const user = useUser();

  if (!user) {
    return <Navigate to="/account/login" />;
  }

  return (
    <>
      <PageTitle title={`${t("user.account")} - Abacus`} />
      <header>
        <section>
          <h1>{t("user.account")}</h1>
        </section>
      </header>
      <main>
        <article>
          <ul>
            <li>
              <Link to={`login`}>{t("user.login")}</Link>
            </li>
          </ul>
        </article>
      </main>
    </>
  );
}
