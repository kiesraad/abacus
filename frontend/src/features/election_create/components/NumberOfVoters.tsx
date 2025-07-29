import { Navigate, useNavigate } from "react-router";

import { NumberOfVotersForm } from "@/components/election/NumberOfVotersForm";
import { t } from "@/i18n/translate";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function NumberOfVoters() {
  const { state } = useElectionCreateContext();
  const navigate = useNavigate();
  // if no data was stored, navigate back to beginning

  if (!state.election || !state.pollingStations) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(_numberOfVoters: number) {
    await navigate("/elections/create/check-and-save");
  }

  let numberOfVoters = 0;

  for (let ps of state.pollingStations) {
    console.log(ps);
    numberOfVoters += ps.number_of_voters ?? 0;
  }
  console.log(numberOfVoters);
  return (
    <section className="md">
      <NumberOfVotersForm
        defaultValue={0}
        instructions={t("election_management.enter_number_of_voters", {
          name: state.election.name,
          location: state.election.location,
        })}
        button="Volgende"
        onSubmit={handleSubmit}
        hint={undefined}
      />
    </section>
  );
}
