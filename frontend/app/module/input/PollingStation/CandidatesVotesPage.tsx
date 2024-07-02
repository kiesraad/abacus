import { useElectionDataRequest } from "@kiesraad/api";
import { Spinner } from "@kiesraad/ui";
import { CandidatesVotesForm } from "app/component/form/candidates_votes_form/CandidatesVotesForm";
import { useParams } from "react-router-dom";

export function CandidatesVotesPage() {
  const { listNumber } = useParams();
  const { data, loading } = useElectionDataRequest({
    election_id: 1,
  });

  if (!listNumber) {
    return <div>Geen lijstnummer gevonden</div>;
  }

  if (loading) {
    return <Spinner />;
  }

  if (!data) {
    return <div>Geen data gevonden</div>;
  }

  return <CandidatesVotesForm election={data} listNumber={parseInt(listNumber, 10)} />;
}
