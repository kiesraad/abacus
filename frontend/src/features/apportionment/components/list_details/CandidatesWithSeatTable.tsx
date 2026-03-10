import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { Candidate, CandidateVotes } from "@/types/generated/openapi";
import { getCandidateFullNameWithGender } from "@/utils/candidate";
import { cn } from "@/utils/classnames";

import cls from "../Apportionment.module.css";

interface CandidatesWithSeatOrRankTableProps {
  id: string;
  startSeatNumber?: number;
  showPosition: boolean;
  showVotes: boolean;
  candidateList: Candidate[];
  candidateVotesList: CandidateVotes[];
}

export function CandidatesWithSeatTable({
  id,
  startSeatNumber = 1,
  showPosition,
  showVotes,
  candidateList,
  candidateVotesList,
}: CandidatesWithSeatOrRankTableProps) {
  const candidateWithVotesList = candidateVotesList.map((candidateVotes) =>
    Object.assign({}, candidateVotes, candidateList[candidateVotes.number - 1]),
  );
  return (
    <Table id={id} className={cn(cls.table)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r w-5">{t("apportionment.seat")}</Table.HeaderCell>
        <Table.HeaderCell>{t("name")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>
        {showPosition && (
          <Table.HeaderCell className="text-align-r">{t("apportionment.position_on_list")}</Table.HeaderCell>
        )}
        {showVotes && <Table.HeaderCell className="text-align-r">{t("vote_count")}</Table.HeaderCell>}
      </Table.Header>
      <Table.Body>
        {candidateWithVotesList.map((candidate, index) => (
          <Table.Row key={candidate.number}>
            <Table.Cell>{startSeatNumber + index}</Table.Cell>
            <Table.Cell>{getCandidateFullNameWithGender(candidate)}</Table.Cell>
            <Table.Cell>{candidate.locality}</Table.Cell>
            {showPosition && <Table.Cell className="text-align-r">{candidate.number}</Table.Cell>}
            {showVotes && <Table.Cell className="text-align-r">{candidate.votes}</Table.Cell>}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
