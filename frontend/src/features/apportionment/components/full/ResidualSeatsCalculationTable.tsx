import { Table } from "@kiesraad/ui";

import cls from "@/features/apportionment/components/ApportionmentTable.module.css";
import { cn } from "@/utils";
import { t } from "@/utils/i18n/i18n";

interface ResidualSeatsCalculationTableProps {
  seats: number;
  fullSeats: number;
  residualSeats: number;
}

export function ResidualSeatsCalculationTable({ seats, fullSeats, residualSeats }: ResidualSeatsCalculationTableProps) {
  return (
    <Table id="residual_seats_calculation_table" className={cn(cls.table, cls.residualSeatsCalculationTable)}>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row" className="bb-none normal">
            {t("apportionment.total_number_seats")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number bb-none normal">{seats}</Table.NumberCell>
          <Table.Cell className="bb-none" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.total_number_assigned_full_seats")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">{fullSeats}</Table.NumberCell>
          <Table.Cell>— ({t("apportionment.minus")})</Table.Cell>
        </Table.Row>
        <Table.TotalRow>
          <Table.HeaderCell scope="row" className="bb-none">
            {t("apportionment.residual_seat.plural")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number">{residualSeats}</Table.NumberCell>
          <Table.Cell />
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
