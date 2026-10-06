import { Footer } from "@/components/footer/Footer";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/i18n/translate";

export function SubCommitteeKeysDetailPage() {
  return (
    <>
      <PageTitle title={`${t("sub_committee_keys.title")} - Abacus`} />
      <header>
        <section>
          <h1>Placeholder</h1>
        </section>
      </header>

      <Messages />

      <Footer />
    </>
  );
}
