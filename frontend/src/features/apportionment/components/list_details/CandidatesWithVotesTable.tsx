import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { Candidate, CandidateVotes } from "@/types/generated/openapi";
import { getCandidateFullNameWithGender } from "@/utils/candidate";
import { cn } from "@/utils/classnames";

import cls from "../Apportionment.module.css";

interface CandidatesWithVotesTableProps {
  id: string;
  showNumber: boolean;
  showLocality: boolean;
  candidateList: Candidate[];
  candidateVotesList: CandidateVotes[];
}

export function CandidatesWithVotesTable({
  id,
  showNumber,
  showLocality,
  candidateList,
  candidateVotesList,
}: CandidatesWithVotesTableProps) {
  const candidateWithVotesList = candidateVotesList.map((candidateVotes) =>
    Object.assign({}, candidateVotes, candidateList[candidateVotes.number - 1]),
  );
  return (
    <Table id={id} className={cn(cls.table)}>
      <Table.Header>
        {showNumber && <Table.HeaderCell>{t("number")}</Table.HeaderCell>}
        <Table.HeaderCell>{t("candidate.title")}</Table.HeaderCell>
        {showLocality && <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>}
        <Table.HeaderCell className="text-align-r">{t("vote_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {candidateWithVotesList.map((candidate) => (
          <Table.Row key={candidate.number}>
            {showNumber && <Table.Cell>{candidate.number}</Table.Cell>}
            <Table.Cell>{getCandidateFullNameWithGender(candidate)}</Table.Cell>
            {showLocality && <Table.Cell>{candidate.locality}</Table.Cell>}
            <Table.Cell className="text-align-r">{candidate.votes}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
