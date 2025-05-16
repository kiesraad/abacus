import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/i18n/translate";

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
