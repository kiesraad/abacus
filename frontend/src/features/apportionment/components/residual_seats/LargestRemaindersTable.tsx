import { PoliticalGroup, PoliticalGroupSeatAssignment } from "@/api";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/util";

import { LargestRemainderAssignmentStep } from "../../utils/seat-change";
import cls from "../Apportionment.module.css";

interface LargestRemaindersTableProps {
  steps: LargestRemainderAssignmentStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
}

export function LargestRemaindersTable({ steps, finalStanding, politicalGroups }: LargestRemaindersTableProps) {
  const finalStandingPgsMeetingThreshold = finalStanding.filter(
    (pg_seat_assignment) => pg_seat_assignment.meets_remainder_threshold,
  );
  return (
    <Table id="largest_remainders_table" className={cls.table}>
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
        {finalStandingPgsMeetingThreshold.map((pg_seat_assignment) => {
          const residual_seats = steps.filter((step) => {
            return step.change.selected_pg_number == pg_seat_assignment.pg_number;
          }).length;
          return (
            <Table.Row key={pg_seat_assignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pg_seat_assignment.pg_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number">{pg_seat_assignment.full_seats}</Table.NumberCell>
              <Table.DisplayFractionCells className={residual_seats > 0 ? "bg-yellow bold" : undefined}>
                {pg_seat_assignment.remainder_votes}
              </Table.DisplayFractionCells>
              <Table.NumberCell className="font-number">{residual_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
