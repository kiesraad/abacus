import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, isSuccess } from "@/api/ApiResult.ts";
import { useApiClient } from "@/api/useApiClient";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import cls from "./ElectionManagement.module.css";

export function FinishDataEntryPage() {
  const { committeeSession, election, refetch } = useElection();
  const client = useApiClient();
  const navigate = useNavigate();
  const [changeStatusError, setChangeStatusError] = useState<AnyApiError | null>(null);

  if (changeStatusError) {
    throw changeStatusError;
  }

  useEffect(() => {
    // Redirect to report download if committee session data entry phase is already finished
    if (committeeSession.status === "data_entry_finished") {
      void navigate(`/elections/${election.id}/report/download`);
    }
  }, [committeeSession, election, navigate]);

  function handleFinish() {
    const url: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}/status`;
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_finished" };
    void client
      .putRequest(url, body)
      .then(async (result) => {
        if (isSuccess(result)) {
          await refetch();
        } else {
          throw result;
        }
      })
      .catch(setChangeStatusError);
  }

  return (
    <>
      <PageTitle title={`${t("election.title.finish_data_entry")} - Abacus`} />
      <header>
        <section>
          <h1>
            {t("election_management.data_entry")} {committeeSessionLabel(committeeSession.number).toLowerCase()}{" "}
            {t("complete").toLowerCase()}
          </h1>
        </section>
      </header>
      <main>
        <article>
          <h2 className="form_title">{t("election.title.finish_data_entry")}?</h2>
          <div className={cls.reportInfoSection}>
            {t("election_management.about_to_stop_data_entry")}
            {tx("election_management.data_entry_finish_steps_explanation")}
          </div>
          <FormLayout.Controls>
            <Button type="submit" onClick={handleFinish}>
              {t("election.title.finish_data_entry")}
            </Button>
            <Button.Link type="button" variant="secondary" to="../status">
              {t("election_management.stay_in_data_entry_phase")}
            </Button.Link>
          </FormLayout.Controls>
        </article>
      </main>
      <Footer />
    </>
  );
}
