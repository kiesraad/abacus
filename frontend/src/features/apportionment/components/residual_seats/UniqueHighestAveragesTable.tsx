import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ListSeatAssignment, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import type { UniqueHighestAverageAssignmentStep } from "../../utils/steps";
import cls from "../Apportionment.module.css";

interface UniqueHighestAveragesTableProps {
  steps: UniqueHighestAverageAssignmentStep[];
  finalStanding: ListSeatAssignment[];
  politicalGroups: PoliticalGroup[];
}

export function UniqueHighestAveragesTable({ steps, finalStanding, politicalGroups }: UniqueHighestAveragesTableProps) {
  return (
    <Table id="unique-highest-averages-table" className={cls.table}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="w-full">{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.full_seats_count")}</Table.HeaderCell>
        <Table.HeaderCell span={2} className="text-align-r">
          {t("apportionment.average")}
        </Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStanding.map((listSeatAssignment) => {
          if (steps[0]?.change.list_exhausted.includes(listSeatAssignment.list_number)) {
            return null;
          } else {
            const average = steps[0]?.standings.find(
              (standing) => standing.list_number === listSeatAssignment.list_number,
            )?.next_votes_per_seat;
            const listSeatAssignmentSteps = steps.filter((step) => {
              return step.change.selected_list_number === listSeatAssignment.list_number;
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
                <Table.NumberCell className="bold">{listSeatAssignment.full_seats}</Table.NumberCell>
                <Table.DisplayFractionCells>{average}</Table.DisplayFractionCells>
                <Table.NumberCell className="bold">{listSeatAssignmentSteps.length}</Table.NumberCell>
              </Table.Row>
            );
          }
        })}
      </Table.Body>
    </Table>
  );
}
