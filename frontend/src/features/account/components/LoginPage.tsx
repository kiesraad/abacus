import { PageTitle } from "@kiesraad/ui";

import { LoginForm } from "@/features/account/components/LoginForm";
import { t } from "@/utils/i18n/i18n";

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
