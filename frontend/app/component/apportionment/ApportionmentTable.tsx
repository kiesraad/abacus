import { PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface ApportionmentTableProps {
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  wholeSeats: number;
  residualSeats: number;
  seats: number;
}

function convert_zero_to_dash(number: number): string {
  if (number === 0) {
    return "-";
  }
  return number.toString();
}

export function ApportionmentTable({
  finalStanding,
  politicalGroups,
  wholeSeats,
  residualSeats,
  seats,
}: ApportionmentTableProps) {
  return (
    <Table id="apportionment_table" className={cn(cls.table, cls.apportionmentTable)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.whole_seat.plural")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.residual_seat.plural")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r link-cell-padding">{t("apportionment.total_seats")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStanding.map((standing: PoliticalGroupSeatAssignment) => {
          return (
            /* TODO: Add row link */
            <Table.LinkRow key={standing.pg_number} to=".">
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                {standing.pg_number}
              </Table.Cell>
              <Table.Cell>{politicalGroups[standing.pg_number - 1]?.name || ""}</Table.Cell>
              <Table.NumberCell className="font-number normal">
                {convert_zero_to_dash(standing.whole_seats)}
              </Table.NumberCell>
              <Table.NumberCell className="font-number normal">
                {convert_zero_to_dash(standing.residual_seats)}
              </Table.NumberCell>
              <Table.NumberCell className="font-number">{convert_zero_to_dash(standing.total_seats)}</Table.NumberCell>
            </Table.LinkRow>
          );
        })}
        <Table.TotalRow>
          <Table.Cell />
          <Table.Cell className="text-align-r bold">{t("apportionment.total")}</Table.Cell>
          <Table.NumberCell className="font-number">{wholeSeats}</Table.NumberCell>
          <Table.NumberCell className="font-number">{residualSeats}</Table.NumberCell>
          <Table.NumberCell className="font-number link-cell-padding">{seats}</Table.NumberCell>
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
