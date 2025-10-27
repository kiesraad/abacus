import { useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { NumberOfVotersForm } from "@/components/election/NumberOfVotersForm";
import { Footer } from "@/components/footer/Footer";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";

export function NumberOfVotersPage() {
  const navigate = useNavigate();
  const { currentCommitteeSession, election } = useElection();
  const updatePath: COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH = `/api/elections/${currentCommitteeSession.election_id}/committee_sessions/${currentCommitteeSession.id}/voters`;
  const { update } = useCrud({ updatePath, throwAllErrors: true });

  function handleSubmit(numberOfVoters: number) {
    const body: COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY = { number_of_voters: numberOfVoters };
    void update(body).then((result) => {
      if (isSuccess(result)) {
        void navigate("..");
      }
    });
  }

  const instructions = t("election_management.enter_number_of_voters", {
    name: election.name.toLowerCase(),
    location: election.location,
  });

  return (
    <>
      <header>
        <section>
          <h1>
            {/* TODO: Change to conditional GSB/HSB/CSB when implemented */}
            {t("GSB")} {election.location}
          </h1>
        </section>
      </header>
      <main>
        <article>
          <NumberOfVotersForm
            defaultValue={currentCommitteeSession.number_of_voters}
            instructions={instructions}
            hint={t("election_management.enter_a_number")}
            button={t("save")}
            onSubmit={handleSubmit}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}
