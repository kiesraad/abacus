import { Fraction, PoliticalGroup, PoliticalGroupSeatAssignment } from "@/api/gen/openapi";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/util/classnames";

import { getFootnotes, resultChange } from "../../utils/seat-change";
import cls from "../Apportionment.module.css";

interface FullSeatsTableProps {
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  quota: Fraction;
  resultChanges: resultChange[];
}

export function FullSeatsTable({ finalStanding, politicalGroups, quota, resultChanges }: FullSeatsTableProps) {
  return (
    <Table id="full-seats-table" className={cn(cls.table, cls.fullSeatsTable)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="w-full">{t("list_name")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("vote_count")}</Table.HeaderCell>
        <Table.HeaderCell>:</Table.HeaderCell>
        <Table.HeaderCell span={2} className="text-align-r">
          {t("apportionment.quota")}
        </Table.HeaderCell>
        <Table.HeaderCell>=</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.full_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {finalStanding.map((standing: PoliticalGroupSeatAssignment) => {
          const pgResultChanges = resultChanges.filter((change) => change.pgNumber === standing.pg_number);
          return (
            <Table.Row key={standing.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "bold")}>{standing.pg_number}</Table.Cell>
              <Table.Cell>{politicalGroups.find((pg) => pg.number === standing.pg_number)?.name ?? ""}</Table.Cell>
              <Table.NumberCell className="font-number normal">{standing.votes_cast}</Table.NumberCell>
              <Table.Cell>:</Table.Cell>
              <Table.DisplayFractionCells>{quota}</Table.DisplayFractionCells>
              <Table.Cell>=</Table.Cell>
              <Table.NumberCell className="font-number">
                {pgResultChanges.length > 0 && <s>{standing.full_seats + pgResultChanges.length}</s>}{" "}
                {getFootnotes(pgResultChanges)} {standing.full_seats}
              </Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
