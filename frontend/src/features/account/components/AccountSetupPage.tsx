import { useState } from "react";
import { Navigate } from "react-router";

import { ApplicationError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/i18n/translate";
import { LoginResponse } from "@/types/generated/openapi";

import { AccountSetupForm } from "./AccountSetupForm";

export function AccountSetupPage() {
  const { user, setUser } = useApiState();
  const [setupComplete, setSetupComplete] = useState(false);

  function handleSaved(user: LoginResponse) {
    setUser(user);
    setSetupComplete(true);
  }

  if (setupComplete) {
    return <Navigate to="/elections#new-account" />;
  }

  if (!user) {
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  if (user.fullname && !user.needs_password_change) {
    throw new ApplicationError(t("error.forbidden_message"), "Forbidden");
  }

  return (
    <>
      <PageTitle title={`${t("account.account_setup")} - Abacus`} />
      <header>
        <section>
          <h1>{t("account.account_setup")}</h1>
        </section>
      </header>
      <main>
        <article>
          <AccountSetupForm user={user} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
