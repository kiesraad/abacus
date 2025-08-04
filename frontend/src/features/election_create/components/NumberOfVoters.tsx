import { Navigate, useNavigate } from "react-router";

import { NumberOfVotersForm } from "@/components/election/NumberOfVotersForm";
import { t } from "@/i18n/translate";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function NumberOfVoters() {
  const { state } = useElectionCreateContext();
  const navigate = useNavigate();
  // if no data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(numberOfVoters: number | undefined) {
    await navigate("/elections/create/check-and-save");
  }

  let numberOfVoters = undefined;
  if (state.pollingStations) {
    numberOfVoters = 0;
    for (const ps of state.pollingStations) {
      numberOfVoters += ps.number_of_voters ?? 0;
    }
  }

  return (
    <section className="md">
      <NumberOfVotersForm
        defaultValue={numberOfVoters}
        instructions={t("election_management.enter_number_of_voters", {
          name: state.election.name,
          location: state.election.location,
        })}
        button="Volgende"
        onSubmit={() => void handleSubmit(numberOfVoters)}
        hint={numberOfVoters ? t("election.number_of_voters.hint") : undefined}
      />
    </section>
  );
}
