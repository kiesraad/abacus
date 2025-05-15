import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { Candidate } from "@/types/generated/openapi";
import { getCandidateFullNameWithGender } from "@/utils/candidate";
import { cn } from "@/utils/classnames";

import cls from "../Apportionment.module.css";

interface CandidatesRankingTableProps {
  candidateRanking: Candidate[];
}

export function CandidatesRankingTable({ candidateRanking }: CandidatesRankingTableProps) {
  return (
    <Table id="candidates-ranking-table" className={cn(cls.table)}>
      <Table.Header>
        <Table.HeaderCell>{t("candidate.title")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {candidateRanking.map((candidate) => (
          <Table.Row key={candidate.number}>
            <Table.Cell>{getCandidateFullNameWithGender(candidate)}</Table.Cell>
            <Table.Cell>{candidate.locality}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
