import { Candidate } from "@/api/gen/openapi";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { getCandidateFullName, getCandidateFullNameWithGender } from "@/lib/util/candidate";
import { cn } from "@/lib/util/classnames";

import cls from "./Apportionment.module.css";

interface ChosenCandidatesTableProps {
  chosenCandidates: Candidate[];
}

export function ChosenCandidatesTable({ chosenCandidates }: ChosenCandidatesTableProps) {
  return (
    <Table id="chosen-candidates-table" className={cn(cls.table)}>
      <Table.Header>
        <Table.HeaderCell>{t("candidate.title")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {chosenCandidates.map((candidate) => (
          <Table.Row key={`${candidate.number}-${getCandidateFullName(candidate)}`}>
            <Table.Cell>{getCandidateFullNameWithGender(candidate)}</Table.Cell>
            <Table.Cell>{candidate.locality}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
