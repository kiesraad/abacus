import { PoliticalGroup, PoliticalGroupSeatAssignment } from "@/api/gen/openapi";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/util/classnames";

import { getFootnotes, LargestRemainderAssignmentStep, resultChange } from "../../utils/seat-change";
import cls from "../Apportionment.module.css";

interface LargestRemaindersTableProps {
  steps: LargestRemainderAssignmentStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  resultChanges: resultChange[];
}

export function LargestRemaindersTable({
  steps,
  finalStanding,
  politicalGroups,
  resultChanges,
}: LargestRemaindersTableProps) {
  const finalStandingPgsMeetingThreshold = finalStanding.filter(
    (pgSeatAssignment) => pgSeatAssignment.meets_remainder_threshold,
  );
  return (
    <Table id="largest-remainders-table" className={cls.table}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="w-full">{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.full_seats_count")}</Table.HeaderCell>
        <Table.HeaderCell span={2} className="text-align-r">
          {t("apportionment.remainder")}
        </Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStandingPgsMeetingThreshold.map((pgSeatAssignment) => {
          let residualSeats = steps.filter((step) => {
            return step.change.selected_pg_number == pgSeatAssignment.pg_number;
          }).length;
          const pgResultChanges = resultChanges.filter((change) => change.pgNumber === pgSeatAssignment.pg_number);
          pgResultChanges.forEach((pgResultChange) => {
            residualSeats = residualSeats + pgResultChange.increase - pgResultChange.decrease;
          });
          return (
            <Table.Row key={pgSeatAssignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pgSeatAssignment.pg_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[pgSeatAssignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number">{pgSeatAssignment.full_seats}</Table.NumberCell>
              <Table.DisplayFractionCells>{pgSeatAssignment.remainder_votes}</Table.DisplayFractionCells>
              <Table.NumberCell className="font-number">
                {getFootnotes(pgResultChanges)} {residualSeats}
              </Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
