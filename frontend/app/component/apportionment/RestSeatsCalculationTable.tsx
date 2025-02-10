import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface RestSeatsCalculationTableProps {
  seats: number;
  whole_seats: number;
  rest_seats: number;
}

export function RestSeatsCalculationTable({ seats, whole_seats, rest_seats }: RestSeatsCalculationTableProps) {
  return (
    <Table id="rest_seats_calculation_table" className={cn(cls.table, cls.rest_seats_calculation_table)}>
      <Table.Body>
        <Table.Row>
          <Table.Cell className="bb-none">{t("apportionment.total_number_seats")}</Table.Cell>
          <Table.NumberCell className="bb-none normal">{seats}</Table.NumberCell>
          <Table.Cell className="bb-none" />
        </Table.Row>
        <Table.Row>
          <Table.Cell>{t("apportionment.total_number_assigned_whole_seats")}</Table.Cell>
          <Table.NumberCell className="normal">{whole_seats}</Table.NumberCell>
          <Table.Cell>— {t("apportionment.minus")}</Table.Cell>
        </Table.Row>
        <Table.TotalRow>
          <Table.Cell className="bold">{t("apportionment.rest_seat.plural")}</Table.Cell>
          <Table.NumberCell>{rest_seats}</Table.NumberCell>
          <Table.Cell />
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
