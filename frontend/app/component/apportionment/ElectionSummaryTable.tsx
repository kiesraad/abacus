import { Fraction, VotesCounts } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, Table } from "@kiesraad/ui";
import { cn, formatNumber } from "@kiesraad/util";

import cls from "./Apportionment.module.css";

interface ElectionSummaryTableProps {
  votes_counts: VotesCounts;
  seats: number;
  quota: Fraction;
  number_of_voters: number | undefined;
}

export function ElectionSummaryTable({ votes_counts, seats, quota, number_of_voters }: ElectionSummaryTableProps) {
  return (
    <Table id="election_summary_table" className={cn(cls.table, cls.election_summary_table)}>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row" className={cls.bt1Gray}>
            {t("apportionment.voters")}
          </Table.HeaderCell>
          <Table.NumberCell className={cn(cls.bt1Gray, "font-number", "normal")}>
            {number_of_voters ? formatNumber(number_of_voters) : ""}
          </Table.NumberCell>
          <Table.Cell className={cn(cls.bt1Gray, "fs-sm")} />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">{t("apportionment.total_votes_cast_count")}</Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votes_counts.total_votes_cast_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            {number_of_voters
              ? `${t("apportionment.turnout")}: ${Number((votes_counts.total_votes_cast_count / number_of_voters) * 100).toFixed(2)}%`
              : ""}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">{t("voters_and_votes.blank_votes_count")}</Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votes_counts.blank_votes_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            {`${Number((votes_counts.blank_votes_count / votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">{t("voters_and_votes.invalid_votes_count")}</Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votes_counts.invalid_votes_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            {`${Number((votes_counts.invalid_votes_count / votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">{t("voters_and_votes.votes_candidates_count")}</Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votes_counts.votes_candidates_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">{t("apportionment.number_of_seats")}</Table.HeaderCell>
          <Table.NumberCell className="font-number normal">{seats}</Table.NumberCell>
          <Table.Cell className="fs-sm" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">{t("apportionment.quota")}</Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            <DisplayFraction id="quota" fraction={quota} />
          </Table.NumberCell>
          <Table.Cell className="fs-sm">{t("apportionment.quota_description")}</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">{t("apportionment.preference_threshold")}</Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {/* TODO: Add apportionment.preference_threshold in epic #787 */}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">{t("apportionment.preference_threshold_description")}</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}
