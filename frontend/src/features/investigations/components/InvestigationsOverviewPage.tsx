import { useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { IconPlus } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import { COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH } from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

export function InvestigationsOverviewPage() {
  const { currentCommitteeSession, election } = useElection();

  const client = useApiClient();
  const navigate = useNavigate();

  async function handleStart() {
    const url: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${currentCommitteeSession.id}/status`;

    const result_not_started = await client.putRequest(url, { status: "data_entry_not_started" });
    if (!isSuccess(result_not_started)) {
      console.error(result_not_started);
      return;
    }

    const result_in_progress = await client.putRequest(url, { status: "data_entry_in_progress" });
    if (!isSuccess(result_in_progress)) {
      console.error(result_in_progress);
      return;
    }

    await navigate(`/elections/${election.id}`);
  }

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

            <br />
            <br />
            {/* Temporarily until adding an investigation starts the election for data entry again */}
            <Button variant="secondary" size="sm" onClick={() => void handleStart()}>
              <IconPlus />
              {t("election_management.start_data_entry")}
            </Button>
          </nav>
        </section>
      </main>
    </>
  );
}
