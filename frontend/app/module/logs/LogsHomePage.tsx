import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function LogsHomePage() {
  return (
    <>
      <PageTitle title={`${t("activity_log")} - Abacus`} />
      <header>
        <section>
          <h1>{t("activity_log")}</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </>
  );
}
