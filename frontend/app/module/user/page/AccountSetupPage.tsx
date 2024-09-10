import { useState } from "react";

import { AccountSetupForm } from "app/component/form/account_setup/AccountSetupForm";

import { Alert, PageTitle, WorkStationNumber } from "@kiesraad/ui";

export function AccountSetupPage() {
  const [showAlert, setShowAlert] = useState(true);

  function hideAlert() {
    setShowAlert(!showAlert);
  }

  return (
    <>
      <PageTitle title="Account instellen - Abacus" />
      <header>
        <section>
          <h1>Account instellen</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      {showAlert && (
        <Alert type="success" onClose={hideAlert}>
          <h2>Inloggen gelukt</h2>
          <p>We gaan je account instellen voor gebruik. Vul onderstaande gegevens in om verder te gaan.</p>
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
