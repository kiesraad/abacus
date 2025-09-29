import { useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconPlus } from "@/components/generated/icons";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import useInvestigations from "../hooks/useInvestigations";
import { InvestigationCard } from "./InvestigationCard";

export function InvestigationsOverviewPage() {
  const { currentCommitteeSession } = useElection();
  const { investigations, currentInvestigations, handledInvestigations } = useInvestigations();
  const { isCoordinator } = useUserRole();
  const navigate = useNavigate();
  const url: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${currentCommitteeSession.id}/status`;
  const { update, requestState } = useCrud({ update: url });

  if (requestState.status === "api-error") {
    throw requestState.error;
  }

  const finishDataEntry = async () => {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_finished" };
    const result = await update(body);

    if (isSuccess(result)) {
      void navigate("../");
    }
  };

  const allInvestigationsHandled = investigations.length > 0 && investigations.length === handledInvestigations.length;

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

      {allInvestigationsHandled ? (
        <Alert type="success">
          <strong className="heading-md">{t("investigations.all_investigations_finished")}</strong>
          <p>{t("investigations.all_investigations_finished_description")}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              void finishDataEntry();
            }}
            disabled={requestState.status === "loading"}
          >
            {t("election.title.finish_data_entry")}
          </Button>
        </Alert>
      ) : (
        <Messages />
      )}

      <main>
        <section>
          <h2>{t("investigations.from_central_polling_station")}</h2>
          {investigations.length === 0 && (
            <ul className="md mt-0 mb-0">
              <li>{t("investigations.add_investigation_for_each_csb_request")}</li>
              <li>{t("investigations.print_corrigendum_form")}</li>
            </ul>
          )}
          {isCoordinator && currentCommitteeSession.status !== "data_entry_finished" && (
            <nav className="mt-md-lg mb-lg">
              <Button.Link to="./add" variant={investigations.length > 0 ? "secondary" : "primary"}>
                <IconPlus />
                {t("investigations.add_investigation")}
              </Button.Link>
            </nav>
          )}
          {currentInvestigations.map((investigation, index) => (
            <InvestigationCard investigation={investigation} key={index} />
          ))}
          {handledInvestigations.length > 0 && (
            <>
              <h3 className="mb-lg mt-lg">{t("investigations.handled_investigations")}</h3>
              {handledInvestigations.map((investigation, index) => (
                <InvestigationCard investigation={investigation} key={index} />
              ))}
            </>
          )}
        </section>
      </main>
    </>
  );
}
