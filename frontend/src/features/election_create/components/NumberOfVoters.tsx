import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { NumberOfVotersForm } from "@/components/election/NumberOfVotersForm";
import { t } from "@/i18n/translate";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function NumberOfVoters() {
  const { state, dispatch } = useElectionCreateContext();
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();

  // if no data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(numberOfVoters: number) {
    if (numberOfVoters > 0) {
      setError(undefined);
      dispatch({
        type: "SET_NUMBER_OF_VOTERS",
        numberOfVoters,
        isNumberOfVotersUserEdited: numberOfVoters !== state.numberOfVoters,
      });
      await navigate("/elections/create/check-and-save");
    } else {
      setError(t("election.number_of_voters.error"));
    }
  }

  const showHint = !state.isNumberOfVotersUserEdited && state.numberOfVoters !== undefined;

  return (
    <section className="md">
      <NumberOfVotersForm
        defaultValue={state.numberOfVoters}
        instructions={t("election_management.enter_number_of_voters")}
        button="Volgende"
        onSubmit={(value) => void handleSubmit(value)}
        hint={showHint ? t("election.number_of_voters.hint") : undefined}
        error={error}
      />
    </section>
  );
}
