import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/util/classnames";

import cls from "../Apportionment.module.css";

interface ResidualSeatsCalculationTableProps {
  seats: number;
  fullSeats: number;
  residualSeats: number;
}

export function ResidualSeatsCalculationTable({ seats, fullSeats, residualSeats }: ResidualSeatsCalculationTableProps) {
  return (
    <Table id="residual-seats-calculation-table" className={cn(cls.table, cls.residualSeatsCalculationTable)}>
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
