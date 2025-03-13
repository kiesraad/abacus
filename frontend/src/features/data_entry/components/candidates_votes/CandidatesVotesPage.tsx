import { useParams } from "react-router";

import { useElection } from "@/hooks/election/useElection";
import { parseIntStrict } from "@/utils";
import { t } from "@/utils/i18n/i18n";

import { CandidatesVotesForm } from "./CandidatesVotesForm";

export function CandidatesVotesPage() {
  const { listNumber } = useParams();
  const { election } = useElection();

  if (!listNumber) {
    throw new Error("Missing 'listNumber' parameter");
  }

  const parsedListNumber = parseIntStrict(listNumber);
  const group = election.political_groups.find((group) => group.number === parsedListNumber);

  if (!group) {
    return <div>{t("data_entry.list.not_found", { listNumber })}</div>;
  }

  return <CandidatesVotesForm group={group} key={group.number} />;
}
