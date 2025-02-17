import { ApportionmentStep, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface LargestAveragesForLessThan19SeatsTableProps {
  highestAverageSteps: ApportionmentStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
}

export function LargestAveragesForLessThan19SeatsTable({
  highestAverageSteps,
  finalStanding,
  politicalGroups,
}: LargestAveragesForLessThan19SeatsTableProps) {
  return (
    <Table id="largest_averages_for_less_than_19_seats_table" className={cls.table}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.whole_seats_count")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.average")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStanding.map((pg_seat_assignment) => {
          const average = highestAverageSteps[0]?.standing[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
          const residual_seats = highestAverageSteps.filter(
            (step) => step.change.selected_pg_number == pg_seat_assignment.pg_number,
          ).length;
          return (
            <Table.Row key={pg_seat_assignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pg_seat_assignment.pg_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number">{pg_seat_assignment.whole_seats}</Table.NumberCell>
              <Table.NumberCell className={`font-number ${residual_seats > 0 ? "bg-yellow" : "normal"}`}>
                {average && <DisplayFraction id={`${pg_seat_assignment.pg_number}-average`} fraction={average} />}
              </Table.NumberCell>
              <Table.NumberCell className="font-number">{residual_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
