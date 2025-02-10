import { ApportionmentStep, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface LargestAveragesFor19OrMoreSeatsTableProps {
  highest_average_steps: ApportionmentStep[];
  final_standing: PoliticalGroupSeatAssignment[];
  political_groups: PoliticalGroup[];
}

export function LargestAveragesFor19OrMoreSeatsTable({
  highest_average_steps,
  final_standing,
  political_groups,
}: LargestAveragesFor19OrMoreSeatsTableProps) {
  return (
    <div className={cls.overflowX}>
      <Table
        id="largest_averages_for_19_or_more_seats_table"
        className={cn(cls.table, cls.rest_seats_19_or_more_seats_table)}
      >
        <Table.Header>
          <Table.Column className="text-align-r">{t("list")}</Table.Column>
          <Table.Column>{t("list_name")}</Table.Column>
          {highest_average_steps.map((step: ApportionmentStep) => {
            return (
              <Table.Column key={step.rest_seat_number} className="text-align-r">
                {t("apportionment.rest_seat.singular")} {step.rest_seat_number}
              </Table.Column>
            );
          })}
          <Table.Column className="text-align-r">{t("apportionment.rest_seats_count")}</Table.Column>
        </Table.Header>
        <Table.Body>
          {final_standing.map((pg_seat_assignment: PoliticalGroupSeatAssignment) => {
            return (
              <Table.Row key={pg_seat_assignment.pg_number}>
                <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                  {pg_seat_assignment.pg_number}
                </Table.Cell>
                <Table.Cell>{political_groups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
                {highest_average_steps.map((step: ApportionmentStep) => {
                  const average = step.standing[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
                  if (average) {
                    return (
                      <Table.NumberCell
                        key={`${pg_seat_assignment.pg_number}-${step.rest_seat_number}`}
                        className={
                          step.change.pg_options.includes(pg_seat_assignment.pg_number) ? "bg-yellow" : "normal"
                        }
                      >
                        <DisplayFraction id={`${pg_seat_assignment.pg_number}-average`} fraction={average} />
                      </Table.NumberCell>
                    );
                  }
                })}
                <Table.NumberCell>{pg_seat_assignment.rest_seats}</Table.NumberCell>
              </Table.Row>
            );
          })}
          <Table.TotalRow>
            <Table.Cell />
            <Table.Cell className="text-align-r bold">{t("apportionment.rest_seat_assigned_to_list")}</Table.Cell>
            {highest_average_steps.map((step: ApportionmentStep) => {
              return <Table.NumberCell key={step.rest_seat_number}>{step.change.selected_pg_number}</Table.NumberCell>;
            })}
            <Table.Cell />
          </Table.TotalRow>
        </Table.Body>
      </Table>
    </div>
  );
}
