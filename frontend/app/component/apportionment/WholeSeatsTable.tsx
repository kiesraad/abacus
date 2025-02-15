import { Fraction, PoliticalGroupSeatAssignment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface WholeSeatsTableProps {
  final_standing: PoliticalGroupSeatAssignment[];
  quota: Fraction;
}

export function WholeSeatsTable({ final_standing, quota }: WholeSeatsTableProps) {
  return (
    <Table id="whole_seats_table" className={cn(cls.table, cls.wholeSeatsTable)}>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("list")}</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("vote_count")}</Table.HeaderCell>
        <Table.HeaderCell>:</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.quota")}</Table.HeaderCell>
        <Table.HeaderCell>=</Table.HeaderCell>
        <Table.HeaderCell className="text-align-r">{t("apportionment.whole_seats_count")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {final_standing.map((standing: PoliticalGroupSeatAssignment) => {
          return (
            <Table.Row key={standing.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "bold")}>{standing.pg_number}</Table.Cell>
              <Table.NumberCell className="font-number normal">{standing.votes_cast}</Table.NumberCell>
              <Table.Cell>:</Table.Cell>
              <Table.NumberCell className="font-number normal">
                <DisplayFraction id={`${standing.pg_number}-quota`} fraction={quota} />
              </Table.NumberCell>
              <Table.Cell>=</Table.Cell>
              <Table.NumberCell className="font-number">{standing.whole_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
