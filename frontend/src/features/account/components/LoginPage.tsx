import { Navigate } from "react-router";

import { useIsInitialised } from "@/api/useIsInitialised";
import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/i18n/translate";

import { LoginForm } from "./LoginForm";

export function LoginPage() {
  const isInitialised = useIsInitialised();

  if (isInitialised === false) {
    return <Navigate to="/account/initialise" replace />;
  }

  return (
    <>
      <PageTitle title={`${t("account.login")} - Abacus`} />
      <header>
        <section>
          <h1>{t("account.login")}</h1>
        </section>
      </header>
      <main>
        <article>
          <LoginForm />
        </article>
      </main>
    </>
  );
}
