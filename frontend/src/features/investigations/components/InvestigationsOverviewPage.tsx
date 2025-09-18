import { IconPlus } from "@/components/generated/icons";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import { committeeSessionLabel } from "@/utils/committeeSession";

import useInvestigations from "../hooks/useInvestigations";
import { InvestigationCard } from "./InvestigationCard";

export function InvestigationsOverviewPage() {
  const { currentCommitteeSession, election } = useElection();
  const { investigations, currentInvestigations, handledInvestigations } = useInvestigations();

  return (
    <>
      <PageTitle title={`${t("investigations.title")} - Abacus`} />
      <header>
        <section>
          <h1>
            {t("investigations.investigations_in_committee_session", {
              sessionLabel: committeeSessionLabel(currentCommitteeSession.number).toLowerCase(),
            })}
          </h1>
        </section>
      </header>

      <Messages />

      <main>
        <section>
          <h2>{t("investigations.from_central_polling_station")}</h2>
          {investigations.length === 0 && (
            <ul className="md mt-0 mb-0">
              <li>{t("investigations.add_investigation_for_each_csb_request")}</li>
              <li>{t("investigations.print_corrigendum_form")}</li>
            </ul>
          )}
          <nav className="mt-md-lg mb-lg">
            <Button.Link to="./add" variant={investigations.length > 0 ? "secondary" : "primary"}>
              <IconPlus />
              {t("investigations.add_investigation")}
            </Button.Link>
          </nav>
          {currentInvestigations.map((investigation, index) => (
            <InvestigationCard investigation={investigation} electionId={election.id} key={index} />
          ))}
          {handledInvestigations.length > 0 && (
            <>
              <h3 className="mb-lg mt-lg">{t("investigations.handled_investigations")}</h3>
              {handledInvestigations.map((investigation, index) => (
                <InvestigationCard investigation={investigation} electionId={election.id} key={index} />
              ))}
            </>
          )}
        </section>
      </main>
    </>
  );
}
