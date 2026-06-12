import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ListSeatAssignment, ListStanding, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import cls from "./Apportionment.module.css";

interface ApportionmentTableProps {
  finalStanding: ListSeatAssignment[] | ListStanding[] | undefined;
  politicalGroups: PoliticalGroup[];
  fullSeats: number;
  residualSeats: number;
  seats: number;
  notAssignedSeats: number;
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
  notAssignedSeats,
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
        {notAssignedSeats > 0 && (
          <Table.Row id="not-assigned-seats" to={"."}>
            <Table.Cell></Table.Cell>
            <Table.Cell className="bold">{t("apportionment.not_yet_assigned")}</Table.Cell>
            <Table.NumberCell>{convertZeroToDash(0)}</Table.NumberCell>
            <Table.NumberCell>{notAssignedSeats}</Table.NumberCell>
            <Table.NumberCell className="bold">{notAssignedSeats}</Table.NumberCell>
          </Table.Row>
        )}
        {finalStanding?.map((standing) => (
          <Table.Row
            key={standing.list_number}
            id={`list-${standing.list_number}`}
            className={notAssignedSeats > 0 ? cls.rowWithoutLink : undefined}
            to={notAssignedSeats === 0 ? `./${standing.list_number}` : undefined}
          >
            <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
              {standing.list_number}
            </Table.Cell>
            <Table.Cell>
              {formatPoliticalGroupName(
                politicalGroups.find((pg) => pg.number === standing.list_number),
                false,
              )}
            </Table.Cell>
            <Table.NumberCell>{convertZeroToDash(standing.full_seats)}</Table.NumberCell>
            <Table.NumberCell>{convertZeroToDash(standing.residual_seats)}</Table.NumberCell>
            <Table.NumberCell className="bold">
              {convertZeroToDash(
                "total_seats" in standing ? standing.total_seats : standing.full_seats + standing.residual_seats,
              )}
            </Table.NumberCell>
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
