import { useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Footer } from "@/components/footer/Footer";
import { NumberOfVotersForm } from "@/features/election_management/components/NumberOfVotersForm";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";

export function NumberOfVotersPage() {
  const client = useApiClient();
  const navigate = useNavigate();
  const { committeeSession, election } = useElection();
  const [submitError, setSubmitError] = useState<AnyApiError | null>(null);

  if (submitError) {
    throw submitError;
  }

  function handleSubmit(numberOfVoters: number) {
    const path: COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}/voters`;
    const body: COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY = { number_of_voters: numberOfVoters };
    client
      .putRequest(path, body)
      .then((result) => {
        if (isSuccess(result)) {
          void navigate("..");
        } else {
          throw result;
        }
      })
      .catch(setSubmitError);
  }

  const instructions = t("election_management.enter_number_of_voters", {
    name: election.name.toLowerCase(),
    location: election.location,
  });

  return (
    <>
      <header>
        <section>
          <h1>{election.location}</h1>
        </section>
      </header>
      <main>
        <article>
          <NumberOfVotersForm
            defaultValue={committeeSession.number_of_voters}
            instructions={instructions}
            hint={t("election_management.enter_a_number")}
            onSubmit={handleSubmit}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}
