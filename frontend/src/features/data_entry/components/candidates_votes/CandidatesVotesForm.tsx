import { DataEntrySection } from "../DataEntrySection";

export function CandidatesVotesForm({ groupNumber }: { groupNumber: number }) {
  return <DataEntrySection sectionId={`political_group_votes_${groupNumber}`} />;
}
