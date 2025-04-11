import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/lib/i18n";

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
