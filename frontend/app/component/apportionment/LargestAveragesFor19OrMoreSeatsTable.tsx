import { ApportionmentStep, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
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
    <div className={cls.scrollable}>
      <Table
        id="largest_averages_for_19_or_more_seats_table"
        className={cn(cls.table, cls.rest_seats_19_or_more_seats_table)}
      >
        <Table.Header>
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>{t("list")}</Table.HeaderCell>
          <Table.HeaderCell className={cls.sticky}>{t("list_name")}</Table.HeaderCell>
          {highest_average_steps.map((step: ApportionmentStep) => {
            return (
              <Table.HeaderCell key={step.rest_seat_number} className="text-align-r" span={2}>
                {t("apportionment.rest_seat.singular")} {step.rest_seat_number}
              </Table.HeaderCell>
            );
          })}
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>
            {t("apportionment.rest_seats_count")}
          </Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {final_standing.map((pg_seat_assignment: PoliticalGroupSeatAssignment) => {
            return (
              <Table.Row key={pg_seat_assignment.pg_number}>
                <Table.Cell className={cn(cls.listNumberColumn, cls.sticky, "text-align-r", "font-number")}>
                  {pg_seat_assignment.pg_number}
                </Table.Cell>
                <Table.Cell className={cls.sticky}>
                  {political_groups[pg_seat_assignment.pg_number - 1]?.name || ""}
                </Table.Cell>
                {highest_average_steps.map((step: ApportionmentStep) => {
                  const average = step.standing[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
                  if (average) {
                    return (
                      <Table.DisplayFractionCells
                        key={`${pg_seat_assignment.pg_number}-${step.rest_seat_number}`}
                        className={
                          step.change.pg_options.includes(pg_seat_assignment.pg_number) ? "bg-yellow" : "normal"
                        }
                      >
                        {average}
                      </Table.DisplayFractionCells>
                    );
                  }
                })}
                <Table.NumberCell className={cn(cls.sticky, "font-number")}>
                  {pg_seat_assignment.rest_seats}
                </Table.NumberCell>
              </Table.Row>
            );
          })}
          <Table.TotalRow>
            <Table.Cell className={cls.sticky} />
            <Table.Cell className={cn(cls.sticky, "text-align-r", "bold")}>
              {t("apportionment.rest_seat_assigned_to_list")}
            </Table.Cell>
            {highest_average_steps.map((step: ApportionmentStep) => (
              <Table.NumberCell key={step.rest_seat_number} colSpan={2}>
                {step.change.selected_pg_number}
              </Table.NumberCell>
            ))}
            <Table.Cell className={cls.sticky} />
          </Table.TotalRow>
        </Table.Body>
      </Table>
    </div>
  );
}
