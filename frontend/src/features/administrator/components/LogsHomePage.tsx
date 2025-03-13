import { PageTitle } from "@kiesraad/ui";

import { t } from "@/utils/i18n/i18n";

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
