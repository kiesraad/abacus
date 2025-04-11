import { PoliticalGroup, PoliticalGroupSeatAssignment } from "@/api/gen/openapi";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/util/classnames";

import { UniqueHighestAverageAssignmentStep } from "../../utils/seat-change";
import cls from "../Apportionment.module.css";

interface UniqueHighestAveragesTableProps {
  steps: UniqueHighestAverageAssignmentStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
}

export function UniqueHighestAveragesTable({ steps, finalStanding, politicalGroups }: UniqueHighestAveragesTableProps) {
  return (
    <Table id="unique-highest-averages-table" className={cls.table}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="w-full">{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.full_seats_count")}</Table.HeaderCell>
        <Table.HeaderCell span={2} className="text-align-r">
          {t("apportionment.average")}
        </Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStanding.map((pgSeatAssignment) => {
          const average = steps[0]?.standings[pgSeatAssignment.pg_number - 1]?.next_votes_per_seat;
          const residual_seat = steps.filter((step) => {
            return step.change.selected_pg_number == pgSeatAssignment.pg_number;
          }).length;
          return (
            <Table.Row key={pgSeatAssignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pgSeatAssignment.pg_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[pgSeatAssignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number">{pgSeatAssignment.full_seats}</Table.NumberCell>
              {average && <Table.DisplayFractionCells>{average}</Table.DisplayFractionCells>}
              <Table.NumberCell className="font-number">{residual_seat}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
