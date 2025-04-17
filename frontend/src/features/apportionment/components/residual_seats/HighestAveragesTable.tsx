import { PoliticalGroup, PoliticalGroupSeatAssignment } from "@/api/gen/openapi";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/lib/i18n";
import { cn } from "@/utils/classnames";

import { getFootnotes, HighestAverageAssignmentStep, resultChange } from "../../utils/seat-change";
import cls from "../Apportionment.module.css";

interface HighestAveragesTableProps {
  steps: HighestAverageAssignmentStep[];
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  resultChanges: resultChange[];
}

export function HighestAveragesTable({
  steps,
  finalStanding,
  politicalGroups,
  resultChanges,
}: HighestAveragesTableProps) {
  return (
    <div className={cls.scrollable}>
      <Table id="highest-averages-table" className={cn(cls.table, cls.highestAveragesTable)}>
        <Table.Header>
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>{t("list")}</Table.HeaderCell>
          <Table.HeaderCell className={cls.sticky}>{t("list_name")}</Table.HeaderCell>
          {steps.map((step, index) => (
            <Table.HeaderCell key={step.residual_seat_number} className="text-align-r" span={2}>
              {t("apportionment.round")} {index + 1}
            </Table.HeaderCell>
          ))}
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>
            {t("apportionment.residual_seats_count")}
          </Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {finalStanding.map((pgSeatAssignment: PoliticalGroupSeatAssignment) => {
            let residualSeats = steps.filter((step) => {
              return step.change.selected_pg_number == pgSeatAssignment.pg_number;
            }).length;
            const pgResultChanges = resultChanges.filter((change) => change.pgNumber === pgSeatAssignment.pg_number);
            pgResultChanges.forEach((pgResultChange) => {
              residualSeats = residualSeats + pgResultChange.increase - pgResultChange.decrease;
            });
            return (
              <Table.Row key={pgSeatAssignment.pg_number}>
                <Table.Cell className={cn(cls.listNumberColumn, cls.sticky, "text-align-r", "font-number")}>
                  {pgSeatAssignment.pg_number}
                </Table.Cell>
                <Table.Cell className={cls.sticky}>
                  {politicalGroups[pgSeatAssignment.pg_number - 1]?.name || ""}
                </Table.Cell>
                {steps.map((step) => {
                  const average = step.standings[pgSeatAssignment.pg_number - 1]?.next_votes_per_seat;
                  return (
                    <Table.DisplayFractionCells
                      key={`${pgSeatAssignment.pg_number}-${step.residual_seat_number}`}
                      className={
                        step.change.pg_options.includes(pgSeatAssignment.pg_number) ? "bg-yellow bold" : undefined
                      }
                    >
                      {!step.change.pg_exhausted.includes(pgSeatAssignment.pg_number) ? average : undefined}
                    </Table.DisplayFractionCells>
                  );
                })}
                <Table.NumberCell className={cn(cls.sticky, "font-number")}>
                  {getFootnotes(pgResultChanges)} {residualSeats}
                </Table.NumberCell>
              </Table.Row>
            );
          })}
          <Table.TotalRow>
            <Table.Cell className={cls.sticky} />
            <Table.Cell className={cn(cls.sticky, "text-align-r", "nowrap", "bold")}>
              {t("apportionment.residual_seat_assigned_to_list")}
            </Table.Cell>
            {steps.map((step) => (
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
