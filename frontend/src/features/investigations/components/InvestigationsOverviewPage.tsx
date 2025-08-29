import { IconPlus } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import { committeeSessionLabel } from "@/utils/committeeSession";

export function InvestigationsOverviewPage() {
  const { committeeSession } = useElection();
  return (
    <>
      <PageTitle title={`${t("investigations.title")} - Abacus`} />
      <header>
        <section>
          <h1>
            {t("investigations.investigations_in_committee_session", {
              sessionLabel: committeeSessionLabel(committeeSession.number).toLowerCase(),
            })}
          </h1>
        </section>
      </header>
      <main>
        <section className="sm">
          <h2>{t("investigations.from_central_polling_station")}</h2>
          <ul className="mt-0 mb-0">
            <li>{t("investigations.add_investigation_for_each_csb_request")}</li>
            <li>{t("investigations.print_corrigendum_form")}</li>
          </ul>
          <nav className="mt-md-lg">
            <Button.Link to="./add">
              <IconPlus />
              {t("investigations.add_investigation")}
            </Button.Link>
          </nav>
        </section>
      </main>
    </>
  );
}
