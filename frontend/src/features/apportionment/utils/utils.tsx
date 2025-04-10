import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

export function render_title_and_header(sectionTitle: string) {
  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{sectionTitle}</h1>
        </section>
      </header>
    </>
  );
}
