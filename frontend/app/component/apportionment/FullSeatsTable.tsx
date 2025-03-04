import { Fraction, PoliticalGroup, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface FullSeatsTableProps {
  finalStanding: PoliticalGroupSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  quota: Fraction;
}

export function FullSeatsTable({ finalStanding, politicalGroups, quota }: FullSeatsTableProps) {
  return (
    <Table id="full_seats_table" className={cn(cls.table, cls.fullSeatsTable)}>
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
          return (
            <Table.Row key={standing.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "bold")}>{standing.pg_number}</Table.Cell>
              <Table.Cell>{politicalGroups.find((pg) => pg.number === standing.pg_number)?.name ?? ""}</Table.Cell>
              <Table.NumberCell className="font-number normal">{standing.votes_cast}</Table.NumberCell>
              <Table.Cell>:</Table.Cell>
              <Table.DisplayFractionCells>{quota}</Table.DisplayFractionCells>
              <Table.Cell>=</Table.Cell>
              <Table.NumberCell className="font-number">{standing.full_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
