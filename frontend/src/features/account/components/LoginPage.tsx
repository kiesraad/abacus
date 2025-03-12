import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

import { LoginForm } from "@/features/account/components/LoginForm";

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
