import { Fraction, PoliticalGroupSeatAssignment, PoliticalGroupVotes } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface WholeSeatsTableProps {
  final_standing: PoliticalGroupSeatAssignment[];
  quota: Fraction;
  political_group_votes: PoliticalGroupVotes[];
}

export function WholeSeatsTable({ final_standing, quota, political_group_votes }: WholeSeatsTableProps) {
  return (
    <Table id="whole_seats_table" className={cn(cls.table, cls.whole_seats_table)}>
      <Table.Header>
        <Table.Column className="text-align-r">{t("list")}</Table.Column>
        <Table.Column className="text-align-r">{t("vote_count")}</Table.Column>
        <Table.Column>:</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.quota")}</Table.Column>
        <Table.Column>=</Table.Column>
        <Table.Column className="text-align-r">{t("apportionment.whole_seats_count")}</Table.Column>
      </Table.Header>
      <Table.Body>
        {final_standing.map((standing: PoliticalGroupSeatAssignment) => {
          return (
            <Table.Row key={standing.pg_number}>
              <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "bold")}>{standing.pg_number}</Table.Cell>
              <Table.NumberCell className="normal">
                {political_group_votes[standing.pg_number - 1]?.total || ""}
              </Table.NumberCell>
              <Table.Cell>:</Table.Cell>
              <Table.NumberCell className="normal">
                <DisplayFraction id={`${standing.pg_number}-quota`} fraction={quota} />
              </Table.NumberCell>
              <Table.Cell>=</Table.Cell>
              <Table.NumberCell>{standing.whole_seats}</Table.NumberCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
