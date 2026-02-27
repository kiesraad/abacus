import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { DisplayFraction, ListSeatAssignment, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";

import { getFootnotesFromResultChanges, type ResultChange } from "../../utils/seat-change";
import cls from "../Apportionment.module.css";

interface FullSeatsTableProps {
  finalStanding: ListSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  quota: DisplayFraction;
  resultChanges: ResultChange[];
}

export function FullSeatsTable({ finalStanding, politicalGroups, quota, resultChanges }: FullSeatsTableProps) {
  return (
    <Table id="full-seats-table" className={cn(cls.table, cls.fullSeatsTable)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="w-full">{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("vote_count")}</Table.HeaderCell>
        <Table.HeaderCell>:</Table.HeaderCell>
        <Table.HeaderCell span={2} className="text-align-r">
          {t("apportionment.quota")}
        </Table.HeaderCell>
        <Table.HeaderCell>=</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.full_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStanding.map((standing: ListSeatAssignment) => {
          const listResultChanges = resultChanges.filter((change) => change.listNumber === standing.list_number);
          return (
            <Table.Row key={standing.list_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "bold")}>
                {standing.list_number}
              </Table.Cell>
              <Table.Cell>
                {politicalGroups.find((list) => list.number === standing.list_number)?.name ?? ""}
              </Table.Cell>
              <Table.NumberCell>{standing.votes_cast}</Table.NumberCell>
              <Table.Cell>:</Table.Cell>
              <Table.DisplayFractionCells>{quota}</Table.DisplayFractionCells>
              <Table.Cell>=</Table.Cell>
              <Table.NumberCell className="bold">
                {listResultChanges.length > 0 && <s>{standing.full_seats + listResultChanges.length}</s>}{" "}
                {getFootnotesFromResultChanges(listResultChanges)} {standing.full_seats}
              </Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
