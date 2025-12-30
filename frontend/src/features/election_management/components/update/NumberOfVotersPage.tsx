import { useState } from "react";
import { useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { NumberOfVotersForm } from "@/components/election/NumberOfVotersForm";
import { Footer } from "@/components/footer/Footer";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY,
  ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";

export function NumberOfVotersPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const [error, setError] = useState<string | undefined>();
  const updatePath: ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH = `/api/elections/${election.id}/voters`;
  const { update } = useCrud({ updatePath, throwAllErrors: true });

  function handleSubmit(numberOfVoters: number) {
    if (numberOfVoters > 0) {
      setError(undefined);
      const body: ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY = { number_of_voters: numberOfVoters };
      void update(body).then((result) => {
        if (isSuccess(result)) {
          void navigate("..");
        }
      });
    } else {
      setError(t("election.number_of_voters.error"));
    }
  }

  return (
    <>
      <header>
        <section>
          <h1>
            {/* TODO (post 1.0): Change to conditional GSB/HSB/CSB when implemented */}
            {t("GSB")} {election.location}
          </h1>
        </section>
      </header>
      <main>
        <article>
          <NumberOfVotersForm
            defaultValue={election.number_of_voters}
            instructions={t("election_management.enter_number_of_voters")}
            hint={t("election_management.enter_a_number")}
            button={t("save")}
            onSubmit={handleSubmit}
            error={error}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}
