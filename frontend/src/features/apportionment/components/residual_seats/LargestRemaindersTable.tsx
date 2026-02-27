import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ListSeatAssignment, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";

import { getFootnotesFromResultChanges, type ResultChange } from "../../utils/seat-change";
import type { LargestRemainderAssignmentStep } from "../../utils/steps";
import cls from "../Apportionment.module.css";

interface LargestRemaindersTableProps {
  steps: LargestRemainderAssignmentStep[];
  finalStanding: ListSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
}

export function LargestRemaindersTable({
  steps,
  finalStanding,
  politicalGroups,
  resultChanges,
}: LargestRemaindersTableProps) {
  const finalStandingPgsMeetingThreshold = finalStanding.filter(
    (listSeatAssignment) => listSeatAssignment.meets_remainder_threshold,
  );
  return (
    <Table id="largest-remainders-table" className={cls.table}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="w-full">{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.full_seats_count")}</Table.HeaderCell>
        <Table.HeaderCell span={2} className="text-align-r">
          {t("apportionment.remainder")}
        </Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStandingPgsMeetingThreshold.map((listSeatAssignment) => {
          let residualSeats = steps.filter((step) => {
            return step.change.selected_list_number === listSeatAssignment.list_number;
          }).length;
          const listResultChanges = resultChanges.filter(
            (change) => change.type === "residual_seat" && change.listNumber === listSeatAssignment.list_number,
          );
          listResultChanges.forEach((listResultChange) => {
            residualSeats = residualSeats + listResultChange.increase - listResultChange.decrease;
          });
          const listFullSeatsNotes = resultChanges.filter(
            (change) => change.type === "full_seat" && change.listNumber === listSeatAssignment.list_number,
          );
          return (
            <Table.Row key={listSeatAssignment.list_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {listSeatAssignment.list_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[listSeatAssignment.list_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="bold">
                {listFullSeatsNotes.length > 0 && getFootnotesFromResultChanges(listFullSeatsNotes)}{" "}
                {listSeatAssignment.full_seats}
              </Table.NumberCell>
              <Table.DisplayFractionCells>{listSeatAssignment.remainder_votes}</Table.DisplayFractionCells>
              <Table.NumberCell className="bold">
                {getFootnotesFromResultChanges(listResultChanges)} {residualSeats}
              </Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
