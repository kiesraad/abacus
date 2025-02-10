import { ApportionmentResult, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface ApportionmentTableProps {
  apportionment: ApportionmentResult;
  political_groups: PoliticalGroup[];
}

function convert_zero_to_dash(number: number): string {
  if (number === 0) {
    return "-";
  }
  return number.toString();
}

export function ApportionmentTable({ apportionment, political_groups }: ApportionmentTableProps) {
  return (
    <Table id="apportionment" className={cn(cls.table, cls.apportionment_table)}>
      <Table.Header>
        <Table.Column className="text-align-r">{t("list")}</Table.Column>
        <Table.Column>{t("list_name")}</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.whole_seat.plural")}</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.rest_seat.plural")}</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.total_seats")}</Table.Column>
        <Table.Column />
      </Table.Header>
      <Table.Body>
        {apportionment.final_standing.map((standing: PoliticalGroupSeatAssignment) => {
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
              <Table.Cell />
            </Table.LinkRow>
          );
        })}
        <Table.TotalRow>
          <Table.Cell />
          <Table.Cell className="text-align-r bold">{t("apportionment.total")}</Table.Cell>
          <Table.NumberCell className="font-number">{apportionment.whole_seats}</Table.NumberCell>
          <Table.NumberCell className="font-number">{apportionment.rest_seats}</Table.NumberCell>
          <Table.NumberCell className="font-number">{apportionment.seats}</Table.NumberCell>
          <Table.Cell />
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
