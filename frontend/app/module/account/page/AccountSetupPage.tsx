import { useState } from "react";

import { AccountSetupForm } from "app/component/form/user/account_setup/AccountSetupForm";

import { t } from "@kiesraad/i18n";
import { Alert, PageTitle, WorkStationNumber } from "@kiesraad/ui";

export function AccountSetupPage() {
  const [showAlert, setShowAlert] = useState(true);

  function hideAlert() {
    setShowAlert(!showAlert);
  }

  return (
    <>
      <PageTitle title={`${t("user.account_setup")} - Abacus`} />
      <header>
        <section>
          <h1>{t("user.account_setup")}</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      {showAlert && (
        <Alert type="success" onClose={hideAlert}>
          <h2>{t("user.login_success")}</h2>
          <p>{t("user.phrases.setting_up_account")}</p>
        </Alert>
      )}
      <main>
        <article className="no_footer">
          <AccountSetupForm />
        </article>
      </main>
    </>
  );
}
