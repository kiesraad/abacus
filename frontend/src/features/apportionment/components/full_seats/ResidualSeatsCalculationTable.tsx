import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";

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
          <Table.NumberCell className="bb-none">{seats}</Table.NumberCell>
          <Table.Cell className="bb-none" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.total_number_assigned_full_seats")}
          </Table.HeaderCell>
          <Table.NumberCell>{fullSeats}</Table.NumberCell>
          <Table.Cell>— ({t("apportionment.minus")})</Table.Cell>
        </Table.Row>
        <Table.TotalRow>
          <Table.HeaderCell scope="row" className="bb-none">
            {t("apportionment.residual_seat.plural")}
          </Table.HeaderCell>
          <Table.NumberCell className="bold">{residualSeats}</Table.NumberCell>
          <Table.Cell />
        </Table.TotalRow>
      </Table.Body>
    </Table>
  );
}
