import { Link } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/lib/i18n";

export function UserHomePage() {
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
