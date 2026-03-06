import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ChosenCandidate } from "@/types/generated/openapi";
import { getCandidateFullNameWithGender, getLocalityWithCountryCode } from "@/utils/candidate";
import { cn } from "@/utils/classnames";
import { getPoliticalGroupName } from "@/utils/politicalGroup";
import cls from "./Apportionment.module.css";

interface ChosenCandidatesTableProps {
  chosenCandidates: ChosenCandidate[];
}

export function ChosenCandidatesTable({ chosenCandidates }: ChosenCandidatesTableProps) {
  return (
    <Table id="chosen-candidates-table" className={cn(cls.table)}>
      <Table.Header>
        <Table.HeaderCell>{t("name")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.locality")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {chosenCandidates.map((candidate, index) => (
          <Table.Row key={`chosen-candidate-${index + 1}`}>
            <Table.Cell>{getCandidateFullNameWithGender(candidate)}</Table.Cell>
            <Table.Cell>{getLocalityWithCountryCode(candidate)}</Table.Cell>
            <Table.Cell>{getPoliticalGroupName(candidate.list_number, candidate.list_name)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
