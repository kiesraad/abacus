import { PageTitle } from "@kiesraad/ui";

import { t } from "@/utils/i18n/i18n";

export function WorkstationsHomePage() {
  return (
    <>
      <PageTitle title={`${t("workstations.entry_stations")} - Abacus`} />
      <header>
        <section>
          <h1>{t("workstations.manage")}</h1>
        </section>
      </header>
      <main>
        <article>Placeholder</article>
      </main>
    </>
  );
}
