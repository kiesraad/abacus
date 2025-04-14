import { Candidate } from "@/api/gen/openapi";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/lib/i18n";
import { getCandidateFullNameWithGender } from "@/lib/util/candidate";
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
        {chosenCandidates.map((candidate, index) => (
          <Table.Row key={`chosen-candidate-${index + 1}`}>
            <Table.Cell>{getCandidateFullNameWithGender(candidate)}</Table.Cell>
            <Table.Cell>{candidate.locality}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
