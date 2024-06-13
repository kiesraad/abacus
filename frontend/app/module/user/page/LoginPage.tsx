import { WorkStationNumber } from "@kiesraad/ui";
import { LoginForm } from "app/component/form/login/LoginForm";

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
        <article className="grid">
          <LoginForm />
        </article>
      </main>
    </>
  );
}
