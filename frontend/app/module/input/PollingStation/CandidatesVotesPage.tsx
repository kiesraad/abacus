import { useParams } from "react-router-dom";

import { CandidatesVotesForm } from "app/component/form/input/candidates_votes/CandidatesVotesForm";

import { useElection } from "@kiesraad/api";
import { parseIntStrict } from "@kiesraad/util";

export function CandidatesVotesPage() {
  const { listNumber } = useParams();
  const { election } = useElection();

  if (!listNumber) {
    throw Error("Missing 'listNumber' parameter");
  }

  const parsedListNumber = parseIntStrict(listNumber);
  const group = election.political_groups.find((group) => group.number === parsedListNumber);

  if (!group) {
    return <div>Geen lijst gevonden voor {listNumber}</div>;
  }

  return <CandidatesVotesForm group={group} key={group.number} />;
}
