import { Button } from "@/components/ui/Button/Button";
import { t, tx } from "@/i18n/translate";

interface InitialiseWelcomeProps {
  next: () => void;
}

export function InitialiseWelcome({ next }: InitialiseWelcomeProps) {
  return (
    <>
      <header>
        <section>
          <h1>{t("initialise.welcome_title")}</h1>
        </section>
      </header>
      <main>
        <section className="md">
          <h2>{t("initialise.installation_success")}</h2>
          {tx("initialise.setup_instructions")}
          <p className="mt-xl">
            <Button onClick={next}>{t("initialise.create_admin_account")}</Button>
          </p>
        </section>
      </main>
    </>
  );
}
