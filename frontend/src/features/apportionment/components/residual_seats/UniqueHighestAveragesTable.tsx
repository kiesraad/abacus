import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ListSeatAssignment, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { getFootnotesFromResultChanges, type ResultChange } from "../../utils/seat-change";
import type { LargestRemainderAssignmentStep, UniqueHighestAverageAssignmentStep } from "../../utils/steps";
import cls from "../Apportionment.module.css";

interface UniqueHighestAveragesTableProps {
  steps: UniqueHighestAverageAssignmentStep[];
  largestRemainderSteps: LargestRemainderAssignmentStep[];
  standings: ListSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
}

export function UniqueHighestAveragesTable({
  steps,
  largestRemainderSteps,
  standings,
  politicalGroups,
  resultChanges,
}: UniqueHighestAveragesTableProps) {
  return (
    <Table id="unique-highest-averages-table" className={cls.table}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="w-full">{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.already_assigned")}</Table.HeaderCell>
        <Table.HeaderCell span={2} className="text-align-r">
          {t("apportionment.average")}
        </Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {standings.map((listSeatAssignment) => {
          if (steps[0]?.change.list_exhausted.includes(listSeatAssignment.list_number)) {
            return null;
          } else {
            const residualSeatsAlreadyAssigned = largestRemainderSteps.filter((step) => {
              return step.change.selected_list_number === listSeatAssignment.list_number;
            }).length;
            const average = steps[0]?.standings.find(
              (standing) => standing.list_number === listSeatAssignment.list_number,
            )?.next_votes_per_seat;
            let residualSeats = steps.filter((step) => {
              return step.change.selected_list_number === listSeatAssignment.list_number;
            }).length;
            const listResultChanges = resultChanges.filter(
              (change) => change.type === "residual_seat" && change.listNumber === listSeatAssignment.list_number,
            );
            listResultChanges.forEach((listResultChange) => {
              residualSeats = residualSeats + listResultChange.increase - listResultChange.decrease;
            });
            return (
              <Table.Row key={listSeatAssignment.list_number}>
                <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                  {listSeatAssignment.list_number}
                </Table.Cell>
                <Table.Cell>
                  {formatPoliticalGroupName(
                    politicalGroups.find((pg) => pg.number === listSeatAssignment.list_number),
                    false,
                  )}
                </Table.Cell>
                <Table.NumberCell className="bold">
                  {listSeatAssignment.full_seats + residualSeatsAlreadyAssigned}
                </Table.NumberCell>
                <Table.DisplayFractionCells>{average}</Table.DisplayFractionCells>
                <Table.NumberCell className="bold">
                  {getFootnotesFromResultChanges(listResultChanges)} {residualSeats}
                </Table.NumberCell>
              </Table.Row>
            );
          }
        })}
      </Table.Body>
    </Table>
  );
}
