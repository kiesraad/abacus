import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useCrud } from "@/api/useCrud";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import useInvestigations from "@/hooks/election/useInvestigations";
import { t, tx } from "@/i18n/translate";
import type {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import cls from "../ElectionManagement.module.css";

export function FinishDataEntryPage() {
  const { currentCommitteeSession, election, refetch } = useElection();
  const { investigations, handledInvestigations, missingInvestigations } = useInvestigations();
  const navigate = useNavigate();
  const updatePath: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${currentCommitteeSession.election_id}/committee_sessions/${currentCommitteeSession.id}/status`;
  const { update } = useCrud({ updatePath, throwAllErrors: true });

  // Check if all investigations are handled and none are missing
  // Note: There are no investigations in the first committee session
  const incompleteInvestigations =
    investigations.length !== handledInvestigations.length || missingInvestigations.length > 0;

  useEffect(() => {
    if (incompleteInvestigations) {
      void navigate(`/elections/${election.id}/investigations`);
    }

    // Redirect to report download if committee session data entry phase is already finished
    if (currentCommitteeSession.status === "data_entry_finished") {
      void navigate(`/elections/${election.id}/report/committee-session/${currentCommitteeSession.id}/download`);
    }
  }, [currentCommitteeSession, election, incompleteInvestigations, navigate]);

  function handleFinish() {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_finished" };
    void update(body).then(() => {
      void refetch();
    });
  }

  return (
    <>
      <PageTitle title={`${t("election.title.finish_data_entry")} - Abacus`} />
      <header>
        <section>
          <h1>
            {t("election_management.data_entry")} {committeeSessionLabel(currentCommitteeSession.number).toLowerCase()}{" "}
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
            <Button.Link variant="secondary" to="../status">
              {t("election_management.stay_in_data_entry_phase")}
            </Button.Link>
          </FormLayout.Controls>
        </article>
      </main>
      <Footer />
    </>
  );
}
