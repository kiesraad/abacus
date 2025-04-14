import { useElection } from "@/api/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/lib/i18n";

import { CandidatesVotesForm } from "./CandidatesVotesForm";

export function CandidatesVotesPage() {
  const listNumber = useNumericParam("listNumber");
  const { election } = useElection();

  const group = election.political_groups.find((group) => group.number === listNumber);

  if (!group) {
    return <div>{t("data_entry.list.not_found", { listNumber })}</div>;
  }

  return <CandidatesVotesForm group={group} key={group.number} />;
}
