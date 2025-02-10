import { ApportionmentStep, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface LargestSurplusesTableProps {
  highest_surplus_steps: ApportionmentStep[];
  final_standing: PoliticalGroupSeatAssignment[];
  political_groups: PoliticalGroup[];
}

export function LargestSurplusesTable({
  highest_surplus_steps,
  final_standing,
  political_groups,
}: LargestSurplusesTableProps) {
  const final_standing_pgs_meeting_threshold = final_standing.filter(
    (pg_seat_assignment) => pg_seat_assignment.meets_surplus_threshold,
  );
  return (
    <Table id="largest_surpluses_table" className={cn(cls.table, cls.rest_seats_less_than_19_seats_table)}>
      <Table.Header>
        <Table.Column className="text-align-r">{t("list")}</Table.Column>
        <Table.Column>{t("list_name")}</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.whole_seats_count")}</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.surplus")}</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.rest_seats_count")}</Table.Column>
      </Table.Header>
      <Table.Body>
        {final_standing_pgs_meeting_threshold.map((pg_seat_assignment) => {
          const rest_seats =
            highest_surplus_steps.filter((step) => step.change.selected_pg_number == pg_seat_assignment.pg_number)
              .length || 0;
          return (
            <Table.Row key={pg_seat_assignment.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {pg_seat_assignment.pg_number}
              </Table.Cell>
              <Table.Cell>{political_groups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell>{pg_seat_assignment.whole_seats}</Table.NumberCell>
              <Table.NumberCell className={rest_seats > 0 ? "bg-yellow" : "normal"}>
                <DisplayFraction
                  id={`${pg_seat_assignment.pg_number}-surplus`}
                  fraction={pg_seat_assignment.surplus_votes}
                />
              </Table.NumberCell>
              <Table.NumberCell>{rest_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
