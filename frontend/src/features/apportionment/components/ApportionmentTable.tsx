import { PoliticalGroup, PoliticalGroupSeatAssignment } from "@/api";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/util";

import cls from "./Apportionment.module.css";

interface ApportionmentTableProps {
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  fullSeats: number;
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
        {finalStanding.map((standing: PoliticalGroupSeatAssignment) => (
          <Table.LinkRow key={standing.pg_number} to={`./${standing.pg_number}`}>
            <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
              {standing.pg_number}
            </Table.Cell>
            <Table.Cell>{politicalGroups[standing.pg_number - 1]?.name || ""}</Table.Cell>
            <Table.NumberCell className="font-number normal">
              {convert_zero_to_dash(standing.full_seats)}
            </Table.NumberCell>
            <Table.NumberCell className="font-number normal">
              {convert_zero_to_dash(standing.residual_seats)}
            </Table.NumberCell>
            <Table.NumberCell className="font-number">{convert_zero_to_dash(standing.total_seats)}</Table.NumberCell>
          </Table.LinkRow>
        ))}
        <Table.TotalRow>
          <Table.Cell />
          <Table.Cell className="text-align-r bold">{t("apportionment.total")}</Table.Cell>
          <Table.NumberCell className="font-number">{fullSeats}</Table.NumberCell>
          <Table.NumberCell className="font-number">{residualSeats}</Table.NumberCell>
          <Table.NumberCell className="font-number link-cell-padding">{seats}</Table.NumberCell>
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
