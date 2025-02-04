import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

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
