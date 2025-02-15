import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface ResidualSeatsCalculationTableProps {
  seats: number;
  whole_seats: number;
  residual_seats: number;
}

export function ResidualSeatsCalculationTable({
  seats,
  whole_seats,
  residual_seats,
}: ResidualSeatsCalculationTableProps) {
  return (
    <Table id="residual_seats_calculation_table" className={cn(cls.table, cls.residualSeatsCalculationTable)}>
      <Table.Body>
        <Table.Row>
          <Table.Cell className="bb-none">{t("apportionment.total_number_seats")}</Table.Cell>
          <Table.NumberCell className="font-number bb-none normal">{seats}</Table.NumberCell>
          <Table.Cell className="bb-none" />
        </Table.Row>
        <Table.Row>
          <Table.Cell>{t("apportionment.total_number_assigned_whole_seats")}</Table.Cell>
          <Table.NumberCell className="font-number normal">{whole_seats}</Table.NumberCell>
          <Table.Cell>— {t("apportionment.minus")}</Table.Cell>
        </Table.Row>
        <Table.TotalRow>
          <Table.Cell className="bold">{t("apportionment.residual_seat.plural")}</Table.Cell>
          <Table.NumberCell className="font-number">{residual_seats}</Table.NumberCell>
          <Table.Cell />
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
