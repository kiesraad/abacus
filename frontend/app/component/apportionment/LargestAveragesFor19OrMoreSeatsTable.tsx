import { ApportionmentStep, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface LargestAveragesFor19OrMoreSeatsTableProps {
  highestAverageSteps: ApportionmentStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
}

export function LargestAveragesFor19OrMoreSeatsTable({
  highestAverageSteps,
  finalStanding,
  politicalGroups,
}: LargestAveragesFor19OrMoreSeatsTableProps) {
  return (
    <div className={cls.scrollable}>
      <Table
        id="largest_averages_for_19_or_more_seats_table"
        className={cn(cls.table, cls.residualSeats19OrMoreSeatsTable)}
      >
        <Table.Header>
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>{t("list")}</Table.HeaderCell>
          <Table.HeaderCell className={cls.sticky}>{t("list_name")}</Table.HeaderCell>
          {highestAverageSteps.map((step: ApportionmentStep) => {
            return (
              <Table.HeaderCell key={step.residual_seat_number} className="text-align-r" span={2}>
                {t("apportionment.residual_seat.singular")} {step.residual_seat_number}
              </Table.HeaderCell>
            );
          })}
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>
            {t("apportionment.residual_seats_count")}
          </Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {finalStanding.map((pg_seat_assignment: PoliticalGroupSeatAssignment) => {
            return (
              <Table.Row key={pg_seat_assignment.pg_number}>
                <Table.Cell className={cn(cls.listNumberColumn, cls.sticky, "text-align-r", "font-number")}>
                  {pg_seat_assignment.pg_number}
                </Table.Cell>
                <Table.Cell className={cls.sticky}>
                  {politicalGroups[pg_seat_assignment.pg_number - 1]?.name || ""}
                </Table.Cell>
                {highestAverageSteps.map((step: ApportionmentStep) => {
                  const average = step.standing[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
                  if (average) {
                    return (
                      <Table.DisplayFractionCells
                        key={`${pg_seat_assignment.pg_number}-${step.residual_seat_number}`}
                        className={
                          step.change.pg_options.includes(pg_seat_assignment.pg_number) ? "bg-yellow bold" : undefined
                        }
                      >
                        {average}
                      </Table.DisplayFractionCells>
                    );
                  }
                })}
                <Table.NumberCell className={cn(cls.sticky, "font-number")}>
                  {pg_seat_assignment.residual_seats}
                </Table.NumberCell>
              </Table.Row>
            );
          })}
          <Table.TotalRow>
            <Table.Cell className={cls.sticky} />
            <Table.Cell className={cn(cls.sticky, "text-align-r", "nowrap", "bold")}>
              {t("apportionment.residual_seat_assigned_to_list")}
            </Table.Cell>
            {highestAverageSteps.map((step: ApportionmentStep) => (
              <Table.NumberCell key={step.residual_seat_number} colSpan={2}>
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
