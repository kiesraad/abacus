import { ApportionmentStep, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface LargestAveragesForLessThan19SeatsTableProps {
  highest_average_steps: ApportionmentStep[];
  final_standing: PoliticalGroupSeatAssignment[];
  political_groups: PoliticalGroup[];
}

export function LargestAveragesForLessThan19SeatsTable({
  highest_average_steps,
  final_standing,
  political_groups,
}: LargestAveragesForLessThan19SeatsTableProps) {
  return (
    <Table
      id="largest_averages_for_less_than_19_seats_table"
      className={cn(cls.table, cls.rest_seats_less_than_19_seats_table)}
    >
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.whole_seats_count")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.average")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.rest_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {final_standing.map((pg_seat_assignment) => {
          const average = highest_average_steps[0]?.standing[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
          const rest_seats = highest_average_steps.filter(
            (step) => step.change.selected_pg_number == pg_seat_assignment.pg_number,
          ).length;
          return (
            <Table.Row key={pg_seat_assignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pg_seat_assignment.pg_number}
              </Table.Cell>
              <Table.Cell>{political_groups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell>{pg_seat_assignment.whole_seats}</Table.NumberCell>
              <Table.NumberCell className={rest_seats > 0 ? "bg-yellow" : "normal"}>
                {average && <DisplayFraction id={`${pg_seat_assignment.pg_number}-average`} fraction={average} />}
              </Table.NumberCell>
              <Table.NumberCell>{rest_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
