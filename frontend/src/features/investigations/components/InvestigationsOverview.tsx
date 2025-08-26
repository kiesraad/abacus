import { Footer } from "@/components/footer/Footer";
import { IconPlus } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { t, tx } from "@/i18n/translate";

export function InvestigationsOverview() {
  return (
    <>
      <PageTitle title={`${t("investigations.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("investigations.investigations_second_entry")}</h1>
        </section>
      </header>
      <main>
        <section className="sm">
          <h2>{t("investigations.from_central_polling_station")}</h2>
          {tx("investigations.instructions")}
          <nav className="mt-lg">
            <Button.Link to="./add">
              <IconPlus />
              {t("investigations.add_investigation")}
            </Button.Link>
          </nav>
        </section>
      </main>
      <Footer />
    </>
  );
}
