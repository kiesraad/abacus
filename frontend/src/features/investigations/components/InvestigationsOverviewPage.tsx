import { useEffect } from "react";
import { useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { isSuccess, NotFoundError } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconPlus } from "@/components/generated/icons";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import useInvestigations from "@/hooks/election/useInvestigations";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t, tx } from "@/i18n/translate";
import type {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatList } from "@/utils/strings";

import { InvestigationCard } from "./InvestigationCard";

export function InvestigationsOverviewPage() {
  const { currentCommitteeSession } = useElection();
  const { investigations, currentInvestigations, handledInvestigations, missingInvestigations } = useInvestigations();
  const { refetch: refetchStatuses } = useElectionStatus();
  const { isCoordinator } = useUserRole();
  const navigate = useNavigate();
  const updatePath: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${currentCommitteeSession.election_id}/committee_sessions/${currentCommitteeSession.id}/status`;
  const { update, isLoading } = useCrud({ updatePath, throwAllErrors: true });
  const allInvestigationsHandled = investigations.length > 0 && investigations.length === handledInvestigations.length;

  function finishDataEntry() {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_finished" };
    void update(body).then((result) => {
      if (isSuccess(result)) {
        void navigate("../");
      }
    });
  }

  // Only allow access to the page if the current committee session is a second session
  if (currentCommitteeSession.number < 2) {
    throw new NotFoundError();
  }

  // re-fetch statuses when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetchStatuses(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetchStatuses]);

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

      {isCoordinator &&
        allInvestigationsHandled &&
        currentCommitteeSession.status !== "data_entry_finished" &&
        (missingInvestigations.length > 0 ? (
          <Alert type="warning">
            <strong className="heading-md">{t("investigations.missing_investigations")}</strong>
            <p>
              {tx(
                missingInvestigations.length > 1
                  ? "investigations.missing_investigations_description_plural"
                  : "investigations.missing_investigations_description_singular",
                undefined,
                {
                  numbers: formatList(
                    missingInvestigations.map((i) => i.number),
                    t("and"),
                  ),
                },
              )}
            </p>
          </Alert>
        ) : (
          <Alert type="success">
            <strong className="heading-md">{t("investigations.all_investigations_finished")}</strong>
            <p>{t("investigations.all_investigations_finished_description")}</p>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                finishDataEntry();
              }}
              disabled={isLoading}
            >
              {t("election.title.finish_data_entry")}
            </Button>
          </Alert>
        ))}

      <main>
        <section>
          <h2>{t("investigations.from_central_polling_station")}</h2>
          {investigations.length === 0 && (
            <>
              <p>{t("investigations.add_investigation_for_each_csb_request")}</p>
              <ul className="md mb-0">
                <li>{t("investigations.add_the_reason")}</li>
                <li>{t("investigations.abacus_creates_the_corrigendum")}</li>
                <li>{t("investigations.print_corrigendum_form")}</li>
              </ul>
            </>
          )}
          {isCoordinator && (
            <nav className="mt-md-lg mb-lg">
              <Button.Link to="./add" variant={investigations.length > 0 ? "secondary" : "primary"}>
                <IconPlus />
                {t("investigations.add_investigation")}
              </Button.Link>
            </nav>
          )}
          {currentInvestigations.map((investigation) => (
            <InvestigationCard investigation={investigation} key={investigation.polling_station_id} />
          ))}
          {handledInvestigations.length > 0 && (
            <>
              <h3 className="mb-lg mt-lg">{t("investigations.handled_investigations")}</h3>
              {handledInvestigations.map((investigation) => (
                <InvestigationCard investigation={investigation} key={investigation.polling_station_id} />
              ))}
            </>
          )}
        </section>
      </main>
    </>
  );
}
