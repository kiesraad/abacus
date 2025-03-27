import { Candidate } from "@/api";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn, getCandidateFullName } from "@/lib/util";

import cls from "../Apportionment.module.css";

interface CandidatesRankingTableProps {
  candidateRanking: Candidate[];
}

export function CandidatesRankingTable({ candidateRanking }: CandidatesRankingTableProps) {
  return (
    <Table id="candidates_ranking_table" className={cn(cls.table)}>
      <Table.Header>
        <Table.HeaderCell>{t("candidate.title")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {candidateRanking.map((candidate) => {
          return (
            <Table.Row key={candidate.number}>
              <Table.Cell>{getCandidateFullName(candidate, true)}</Table.Cell>
              <Table.Cell>{candidate.locality}</Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
