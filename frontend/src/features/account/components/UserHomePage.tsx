import { Link, Navigate } from "react-router";

import { useUser } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";

import { t } from "@/utils/i18n/i18n";

export function UserHomePage() {
  const user = useUser();

  if (!user) {
    return <Navigate to="/account/login" />;
  }

  return (
    <>
      <PageTitle title={`${t("account.account")} - Abacus`} />
      <header>
        <section>
          <h1>{t("account.account")}</h1>
        </section>
      </header>
      <main>
        <article>
          <ul>
            <li>
              <Link to={`login`}>{t("account.login")}</Link>
            </li>
          </ul>
        </article>
      </main>
    </>
  );
}
