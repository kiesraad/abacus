import { Navigate } from "react-router";

import { ChangePasswordForm } from "app/component/form/user/change_password/ChangePasswordForm";

import { useUser } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function ChangePasswordPage() {
  const user = useUser();

  if (!user) {
    return <Navigate to="/account/login" />;
  }

  return (
    <>
      <PageTitle title={`${t("account.change_password")} - Abacus`} />
      <header>
        <section>
          <h1>{t("account.change_password")}</h1>
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
