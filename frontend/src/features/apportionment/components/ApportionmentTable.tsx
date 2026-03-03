import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ListSeatAssignment, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";

import cls from "./Apportionment.module.css";

interface ApportionmentTableProps {
  finalStanding: ListSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  fullSeats: number;
  residualSeats: number;
  seats: number;
}

function convertZeroToDash(number: number): string {
  if (number === 0) {
    return "-";
  }
  return number.toString();
}

export function ApportionmentTable({
  finalStanding,
  politicalGroups,
  fullSeats,
  residualSeats,
  seats,
}: ApportionmentTableProps) {
  return (
    <Table id="apportionment-table" className={cls.table}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.full_seat.plural")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seat.plural")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r link-cell-padding">{t("apportionment.total_seats")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStanding.map((standing: ListSeatAssignment) => (
          <Table.Row key={standing.list_number} to={`./${standing.list_number}`}>
            <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
              {standing.list_number}
            </Table.Cell>
            <Table.Cell>{politicalGroups[standing.list_number - 1]?.name || ""}</Table.Cell>
            <Table.NumberCell>{convertZeroToDash(standing.full_seats)}</Table.NumberCell>
            <Table.NumberCell>{convertZeroToDash(standing.residual_seats)}</Table.NumberCell>
            <Table.NumberCell className="bold">{convertZeroToDash(standing.total_seats)}</Table.NumberCell>
          </Table.Row>
        ))}
        <Table.TotalRow>
          <Table.Cell />
          <Table.Cell className="text-align-r bold">{t("apportionment.total")}</Table.Cell>
          <Table.NumberCell>{fullSeats}</Table.NumberCell>
          <Table.NumberCell>{residualSeats}</Table.NumberCell>
          <Table.NumberCell className="link-cell-padding">{seats}</Table.NumberCell>
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
