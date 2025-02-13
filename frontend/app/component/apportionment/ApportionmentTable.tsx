import { PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface ApportionmentTableProps {
  final_standing: PoliticalGroupSeatAssignment[];
  political_groups: PoliticalGroup[];
  whole_seats: number;
  rest_seats: number;
  seats: number;
}

function convert_zero_to_dash(number: number): string {
  if (number === 0) {
    return "-";
  }
  return number.toString();
}

export function ApportionmentTable({
  final_standing,
  political_groups,
  whole_seats,
  rest_seats,
  seats,
}: ApportionmentTableProps) {
  return (
    <Table id="apportionment" className={cn(cls.table, cls.apportionment_table)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.whole_seat.plural")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.rest_seat.plural")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.total_seats")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {final_standing.map((standing: PoliticalGroupSeatAssignment) => {
          return (
            /* TODO: Add row link */
            <Table.LinkRow key={standing.pg_number} to=".">
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {standing.pg_number}
              </Table.Cell>
              <Table.Cell>{political_groups[standing.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number normal">
                {convert_zero_to_dash(standing.whole_seats)}
              </Table.NumberCell>
              <Table.NumberCell className="font-number normal">
                {convert_zero_to_dash(standing.rest_seats)}
              </Table.NumberCell>
              <Table.NumberCell className="font-number">{convert_zero_to_dash(standing.total_seats)}</Table.NumberCell>
            </Table.LinkRow>
          );
        })}
        <Table.TotalRow>
          <Table.Cell />
          <Table.Cell className="text-align-r bold">{t("apportionment.total")}</Table.Cell>
          <Table.NumberCell className="font-number">{whole_seats}</Table.NumberCell>
          <Table.NumberCell className="font-number">{rest_seats}</Table.NumberCell>
          <Table.NumberCell className="font-number">{seats}</Table.NumberCell>
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
