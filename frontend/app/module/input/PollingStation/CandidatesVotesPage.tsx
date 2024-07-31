import { useParams } from "react-router-dom";

import { CandidatesVotesForm } from "app/component/form/candidates_votes_form/CandidatesVotesForm";

import { useElection } from "@kiesraad/api";

export function CandidatesVotesPage() {
  const { listNumber } = useParams();
  const { election } = useElection();

  if (!listNumber) {
    throw Error("Missing 'listNumber' parameter");
  }

  const group = election.political_groups.find(
    (group) => group.number === parseInt(listNumber, 10),
  );

  if (!group) {
    return <div>Geen lijst gevonden voor {listNumber}</div>;
  }

  return <CandidatesVotesForm group={group} />;
}
