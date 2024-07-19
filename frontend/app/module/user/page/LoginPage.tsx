import { LoginForm } from "app/component/form/login/LoginForm";

import { WorkStationNumber } from "@kiesraad/ui";

export function LoginPage() {
  return (
    <>
      <header>
        <section>
          <h1>Inloggen</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
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
