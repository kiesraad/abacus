import { LoginForm } from "app/component/form/user/login/LoginForm";

import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function LoginPage() {
  return (
    <>
      <PageTitle title={`${t("user.login")} - Abacus`} />
      <header>
        <section>
          <h1>{t("user.login")}</h1>
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
