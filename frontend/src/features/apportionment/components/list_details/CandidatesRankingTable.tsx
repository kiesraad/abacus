import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { Candidate } from "@/types/generated/openapi";
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
        <Table.HeaderCell>{t("apportionment.rank")}</Table.HeaderCell>
        <Table.HeaderCell>{t("name")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.position_on_list")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {candidateRanking.map((candidate, index) => (
          <Table.Row key={candidate.number}>
            <Table.Cell>{index + 1}</Table.Cell>
            <Table.Cell>{getCandidateFullNameWithGender(candidate)}</Table.Cell>
            <Table.Cell>{candidate.locality}</Table.Cell>
            <Table.Cell className="text-align-r">{candidate.number}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
