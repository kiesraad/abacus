import { useParams } from "react-router-dom";

import { useElection } from "@kiesraad/api";
import { CandidatesVotesForm } from "app/component/form/candidates_votes_form/CandidatesVotesForm";

export function CandidatesVotesPage() {
  const { listNumber } = useParams();
  const { election } = useElection();

  if (!listNumber) {
    return <div>Geen lijstnummer gevonden</div>;
  }

  const group = election.political_groups.find(
    (group) => group.number === parseInt(listNumber, 10),
  );

  if (!group) {
    return <div>Geen lijst gevonden voor {listNumber}</div>;
  }

  return <CandidatesVotesForm group={group} />;
}
