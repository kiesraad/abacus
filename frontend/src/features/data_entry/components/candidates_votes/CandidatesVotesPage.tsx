import { useNumericParam } from "@/hooks/useNumericParam";

import { CandidatesVotesForm } from "./CandidatesVotesForm";

export function CandidatesVotesPage() {
  const groupNumber = useNumericParam("groupNumber");
  return <CandidatesVotesForm groupNumber={groupNumber} />;
}
