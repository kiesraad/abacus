import { ApportionmentStep, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface LargestSurplusesTableProps {
  highestSurplusSteps: ApportionmentStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
}

export function LargestSurplusesTable({
  highestSurplusSteps,
  finalStanding,
  politicalGroups,
}: LargestSurplusesTableProps) {
  const finalStandingPgsMeetingThreshold = finalStanding.filter(
    (pg_seat_assignment) => pg_seat_assignment.meets_surplus_threshold,
  );
  return (
    <Table id="largest_surpluses_table" className={cn(cls.table, cls.residualSeatsLessThan19SeatsTable)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.whole_seats_count")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.surplus")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStandingPgsMeetingThreshold.map((pg_seat_assignment) => {
          const residual_seats =
            highestSurplusSteps.filter((step) => step.change.selected_pg_number == pg_seat_assignment.pg_number)
              .length || 0;
          return (
            <Table.Row key={pg_seat_assignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pg_seat_assignment.pg_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number">{pg_seat_assignment.whole_seats}</Table.NumberCell>
              <Table.NumberCell className={`font-number ${residual_seats > 0 ? "bg-yellow" : "normal"}`}>
                <DisplayFraction
                  id={`${pg_seat_assignment.pg_number}-surplus`}
                  fraction={pg_seat_assignment.surplus_votes}
                />
              </Table.NumberCell>
              <Table.NumberCell className="font-number">{residual_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
