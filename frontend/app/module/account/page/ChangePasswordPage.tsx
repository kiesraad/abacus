import { ChangePasswordForm } from "app/component/form/user/change_password/ChangePasswordForm";

import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function ChangePasswordPage() {
  return (
    <>
      <PageTitle title={`${t("user.change_password")} - Abacus`} />
      <header>
        <section>
          <h1>{t("user.change_password")}</h1>
        </section>
      </header>
      <main>
        <article className="no_footer">
          <ChangePasswordForm />
        </article>
      </main>
    </>
  );
}
