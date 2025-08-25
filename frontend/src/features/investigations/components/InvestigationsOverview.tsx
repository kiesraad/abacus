import { Footer } from "@/components/footer/Footer";
import { IconPlus } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { t, tx } from "@/i18n/translate";

export function InvestigationsOverview() {
  return (
    <>
      <header>
        <section>
          <h1>{t("investigations.investigations_second_entry")}</h1>
        </section>
      </header>
      <main>
        <section className="md">
          <h2>{t("investigations.from_central_polling_station")}</h2>
          {tx("investigations.instructions")}
          <p className="mt-xl">
            <Button.Link to="./add">
              <IconPlus />
              {t("investigations.add_investigation")}
            </Button.Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
