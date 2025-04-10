import { PageTitle } from "@/components/page-title/page-title";
import { t } from "@/lib/i18n";

import { LoginForm } from "./LoginForm";

export function LoginPage() {
  return (
    <>
      <PageTitle title={`${t("account.login")} - Abacus`} />
      <header>
        <section>
          <h1>{t("account.login")}</h1>
        </section>
      </header>
      <main>
        <article className="no_footer">
          <LoginForm />
        </article>
      </main>
    </>
  );
}
