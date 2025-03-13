import { Navigate, useNavigate } from "react-router";

import { useApiState } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";

import { LoginResponse } from "@/types/generated/openapi";
import { t } from "@/utils/i18n/i18n";

import { AccountSetupForm } from "./AccountSetupForm";

export function AccountSetupPage() {
  const navigate = useNavigate();

  const { user, setUser } = useApiState();

  if (!user) {
    return <Navigate to="/account/login" />;
  }

  function handleSaved(user: LoginResponse) {
    setUser(user);
    void navigate("/elections#new-account");
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
        <article className="no_footer">
          <AccountSetupForm user={user} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
