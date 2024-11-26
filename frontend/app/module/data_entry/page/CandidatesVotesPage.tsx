import { useParams } from "react-router-dom";

import { CandidatesVotesForm } from "app/component/form/data_entry/candidates_votes/CandidatesVotesForm";

import { useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { parseIntStrict } from "@kiesraad/util";

export function CandidatesVotesPage() {
  const { listNumber } = useParams();
  const { election } = useElection();

  if (!listNumber) {
    throw new Error("Missing 'listNumber' parameter");
  }

  const parsedListNumber = parseIntStrict(listNumber);
  const group = election.political_groups.find((group) => group.number === parsedListNumber);

  if (!group) {
    return <div>{t("data_entry.list.not-found", { listNumber })}</div>;
  }

  return <CandidatesVotesForm group={group} key={group.number} />;
}
