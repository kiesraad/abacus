import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { Candidate, CandidateVotes } from "@/types/generated/openapi";
import { getCandidateFullNameWithGender, getCandidateLocalityWithCountryCode } from "@/utils/candidate";
import { cn } from "@/utils/classnames";
import { formatVoteCount } from "@/utils/number";

import cls from "../Apportionment.module.css";

interface CandidatesWithVotesTableProps {
  id: string;
  candidateList: Candidate[];
  candidateVotesList: CandidateVotes[];
  deceasedCandidateNumbersList: number[];
}

export function CandidatesWithVotesTable({
  id,
  candidateList,
  candidateVotesList,
  deceasedCandidateNumbersList,
}: CandidatesWithVotesTableProps) {
  const candidateWithVotesList = candidateVotesList.map((candidateVotes) =>
    Object.assign({}, candidateVotes, candidateList[candidateVotes.number - 1]),
  );
  return (
    <Table id={id} className={cn(cls.table)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r w-5">{t("number")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.title.singular")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("vote_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {candidateWithVotesList.map((candidate) => (
          <Table.Row key={candidate.number}>
            <Table.Cell className="text-align-r">{candidate.number}</Table.Cell>
            <Table.Cell>
              {getCandidateFullNameWithGender(candidate)}
              {deceasedCandidateNumbersList.find((dc_number) => candidate.number === dc_number) !== undefined && (
                <span className="superscript">&nbsp;&nbsp;&dagger;</span>
              )}
            </Table.Cell>
            <Table.Cell>{getCandidateLocalityWithCountryCode(candidate)}</Table.Cell>
            <Table.NumberCell>{formatVoteCount(candidate.votes)}</Table.NumberCell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
