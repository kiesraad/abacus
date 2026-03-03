import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ListSeatAssignment, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";

import { getFootnotesFromResultChanges, type ResultChange } from "../../utils/seat-change";
import type { HighestAverageAssignmentStep } from "../../utils/steps";
import cls from "../Apportionment.module.css";

interface HighestAveragesTableProps {
  steps: HighestAverageAssignmentStep[];
  finalStanding: ListSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
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
          {finalStanding.map((listSeatAssignment: ListSeatAssignment) => {
            let residualSeats = steps.filter((step) => {
              return step.change.selected_list_number === listSeatAssignment.list_number;
            }).length;
            const listResultChanges = resultChanges.filter(
              (change) => change.listNumber === listSeatAssignment.list_number,
            );
            listResultChanges.forEach((listResultChange) => {
              residualSeats = residualSeats + listResultChange.increase - listResultChange.decrease;
            });
            return (
              <Table.Row key={listSeatAssignment.list_number}>
                <Table.Cell className={cn(cls.listNumberColumn, cls.sticky, "text-align-r", "font-number")}>
                  {listSeatAssignment.list_number}
                </Table.Cell>
                <Table.Cell className={cls.sticky}>
                  {politicalGroups[listSeatAssignment.list_number - 1]?.name || ""}
                </Table.Cell>
                {steps.map((step) => {
                  const average = step.standings[listSeatAssignment.list_number - 1]?.next_votes_per_seat;
                  return (
                    <Table.DisplayFractionCells
                      key={`${listSeatAssignment.list_number}-${step.residual_seat_number}`}
                      className={
                        step.change.list_options.includes(listSeatAssignment.list_number) ? "bg-yellow bold" : undefined
                      }
                    >
                      {!step.change.list_exhausted.includes(listSeatAssignment.list_number) ? average : undefined}
                    </Table.DisplayFractionCells>
                  );
                })}
                <Table.NumberCell className={cn(cls.sticky, "bold")}>
                  {getFootnotesFromResultChanges(listResultChanges)} {residualSeats}
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
                {step.change.selected_list_number}
              </Table.NumberCell>
            ))}
            <Table.Cell className={cls.sticky} />
          </Table.TotalRow>
        </Table.Body>
      </Table>
    </div>
  );
}
