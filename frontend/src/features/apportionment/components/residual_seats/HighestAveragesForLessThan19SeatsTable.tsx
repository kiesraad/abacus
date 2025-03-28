import { HighestAverageAssignedSeat, PoliticalGroup, PoliticalGroupSeatAssignment, SeatChangeStep } from "@/api";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/util";

import cls from "../Apportionment.module.css";

interface HighestAveragesForLessThan19SeatsTableProps {
  highestAverageSteps: SeatChangeStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
}

export function HighestAveragesForLessThan19SeatsTable({
  highestAverageSteps,
  finalStanding,
  politicalGroups,
}: HighestAveragesForLessThan19SeatsTableProps) {
  return (
    <Table id="highest-averages-for-less-than-19-seats-table" className={cls.table}>
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
        {finalStanding.map((pg_seat_assignment) => {
          const average = highestAverageSteps[0]?.standings[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
          const residual_seats = highestAverageSteps.filter((step) => {
            const change = step.change as HighestAverageAssignedSeat;
            return change.selected_pg_number === pg_seat_assignment.pg_number;
          }).length;
          return (
            <Table.Row key={pg_seat_assignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pg_seat_assignment.pg_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number">{pg_seat_assignment.full_seats}</Table.NumberCell>
              {average && (
                <Table.DisplayFractionCells className={residual_seats > 0 ? "bg-yellow bold" : undefined}>
                  {average}
                </Table.DisplayFractionCells>
              )}
              <Table.NumberCell className="font-number">{residual_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
