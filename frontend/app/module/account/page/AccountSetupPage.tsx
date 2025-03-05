import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { AccountSetupForm } from "app/component/form/account/account_setup/AccountSetupForm";

import { LoginResponse, useApiState } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, PageTitle } from "@kiesraad/ui";

export function AccountSetupPage() {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(true);
  const { user, setUser } = useApiState();

  if (!user) {
    return <Navigate to="/account/login" />;
  }

  function hideAlert() {
    setShowAlert(!showAlert);
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
      {showAlert && (
        <Alert type="success" onClose={hideAlert}>
          <h2>{t("account.login_success")}</h2>
          <p>{t("account.setting_up_account")}</p>
        </Alert>
      )}
      <main>
        <article className="no_footer">
          <AccountSetupForm user={user} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
