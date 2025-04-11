import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/lib/i18n";

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
