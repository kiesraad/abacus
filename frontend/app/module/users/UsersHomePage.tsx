import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function UsersHomePage() {
  return (
    <>
      <PageTitle title={`${t("user.management")} - Abacus`} />
      <header>
        <section>
          <h1>{t("user.manage")}</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </>
  );
}
