import { WorkStationNumber } from "@kiesraad/ui";
import { AccountSetupForm } from "app/component/form/account_setup/AccountSetupForm";

export function AccountSetupPage() {
  return (
    <>
      <header>
        <section>
          <h1>Account instellen</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <article>
          {/* TODO: Add alert here */}
          <strong>Inloggen gelukt</strong>
          <br />
          We gaan je account instellen voor gebruik. Vul onderstaande gegevens in om verder te gaan.
          <br />
          <br />
          <AccountSetupForm />
        </article>
      </main>
    </>
  );
}
