import { DisplayFraction } from "@/components/ui/DisplayFraction/DisplayFraction";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/lib/i18n";
import { Fraction, PreferenceThreshold, VotesCounts } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatNumber } from "@/utils/format";

import cls from "./Apportionment.module.css";

interface ElectionSummaryTableProps {
  votesCounts: VotesCounts;
  seats: number;
  quota: Fraction;
  numberOfVoters: number | undefined;
  preferenceThreshold: PreferenceThreshold;
}

export function ElectionSummaryTable({
  votesCounts,
  seats,
  quota,
  numberOfVoters,
  preferenceThreshold,
}: ElectionSummaryTableProps) {
  return (
    <Table id="election-summary-table" className={cn(cls.table, cls.electionSummaryTable)}>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row" className={cn(cls.bt1Gray, "normal")}>
            {t("apportionment.voters")}
          </Table.HeaderCell>
          <Table.NumberCell className={cn(cls.bt1Gray, "font-number", "normal")}>
            {numberOfVoters ? formatNumber(numberOfVoters) : ""}
          </Table.NumberCell>
          <Table.Cell className={cn(cls.bt1Gray, "fs-sm")} />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.total_votes_cast_count")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votesCounts.total_votes_cast_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            {numberOfVoters
              ? `${t("apportionment.turnout")}: ${Number((votesCounts.total_votes_cast_count / numberOfVoters) * 100).toFixed(2)}%`
              : ""}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("voters_and_votes.blank_votes_count")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votesCounts.blank_votes_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            {`${Number((votesCounts.blank_votes_count / votesCounts.total_votes_cast_count) * 100).toFixed(2)}%`}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("voters_and_votes.invalid_votes_count")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votesCounts.invalid_votes_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            {`${Number((votesCounts.invalid_votes_count / votesCounts.total_votes_cast_count) * 100).toFixed(2)}%`}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("voters_and_votes.votes_candidates_count")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            {formatNumber(votesCounts.votes_candidates_count)}
          </Table.NumberCell>
          <Table.Cell className="fs-sm" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.number_of_seats")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">{seats}</Table.NumberCell>
          <Table.Cell className="fs-sm" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.quota")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            <DisplayFraction id="quota" fraction={quota} />
          </Table.NumberCell>
          <Table.Cell className="fs-sm">{t("apportionment.quota_description")}</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.preference_threshold")}
          </Table.HeaderCell>
          <Table.NumberCell className="font-number normal">
            <DisplayFraction id="quota" fraction={preferenceThreshold.number_of_votes} />
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            {t("apportionment.preference_threshold_description", { percentage: preferenceThreshold.percentage })}
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}
