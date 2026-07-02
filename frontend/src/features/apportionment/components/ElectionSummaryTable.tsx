import type { To } from "react-router";
import { Button } from "@/components/ui/Button/Button";
import { DisplayFraction } from "@/components/ui/DisplayFraction/DisplayFraction";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type {
  DisplayFraction as DisplayFractionType,
  PreferenceThreshold,
  VotesCounts,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatNumber, formatPercentage } from "@/utils/number";
import cls from "./Apportionment.module.css";

export interface DeceasedCandidatesInfo {
  numberOfCandidates: number;
  numberOfDeceasedCandidates: number;
  deceasedCandidatesLink: To;
}

interface ElectionSummaryTableProps {
  votesCounts: VotesCounts;
  seats: number;
  quota: DisplayFractionType;
  numberOfVoters: number | undefined;
  preferenceThreshold: PreferenceThreshold | undefined;
  deceasedCandidatesInfo: DeceasedCandidatesInfo;
}

function formatVoteCount(count: number): string {
  return count > 0 ? formatNumber(count) : "0";
}

function formatVotePercentage(count: number, total: number): string {
  return count > 0 ? formatPercentage(count, total) : "";
}

export function ElectionSummaryTable({
  votesCounts,
  seats,
  quota,
  numberOfVoters,
  preferenceThreshold,
  deceasedCandidatesInfo,
}: ElectionSummaryTableProps) {
  return (
    <Table id="election-summary-table" className={cn(cls.table, cls.electionSummaryTable)}>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row" className={cn(cls.bt1Gray, "normal")}>
            {t("apportionment.voters")}
          </Table.HeaderCell>
          <Table.NumberCell className={cls.bt1Gray}>
            {numberOfVoters ? formatNumber(numberOfVoters) : ""}
          </Table.NumberCell>
          <Table.Cell className={cn(cls.bt1Gray, "fs-sm")} />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.total_votes_cast_count")}
          </Table.HeaderCell>
          <Table.NumberCell>{formatVoteCount(votesCounts.total_votes_cast_count)}</Table.NumberCell>
          <Table.Cell className="fs-sm">
            {numberOfVoters && votesCounts.total_votes_cast_count > 0
              ? `${t("apportionment.turnout")}: ${formatVotePercentage(votesCounts.total_votes_cast_count, numberOfVoters)}`
              : ""}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("voters_votes_counts.votes_counts.blank_votes_count")}
          </Table.HeaderCell>
          <Table.NumberCell>{formatVoteCount(votesCounts.blank_votes_count)}</Table.NumberCell>
          <Table.Cell className="fs-sm">
            {formatVotePercentage(votesCounts.blank_votes_count, votesCounts.total_votes_cast_count)}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("voters_votes_counts.votes_counts.invalid_votes_count")}
          </Table.HeaderCell>
          <Table.NumberCell>{formatVoteCount(votesCounts.invalid_votes_count)}</Table.NumberCell>
          <Table.Cell className="fs-sm">
            {formatVotePercentage(votesCounts.invalid_votes_count, votesCounts.total_votes_cast_count)}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("voters_votes_counts.votes_counts.total_votes_candidates_count")}
          </Table.HeaderCell>
          <Table.NumberCell>{formatVoteCount(votesCounts.total_votes_candidates_count)}</Table.NumberCell>
          <Table.Cell className="fs-sm" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.number_of_seats")}
          </Table.HeaderCell>
          <Table.NumberCell>{seats}</Table.NumberCell>
          <Table.Cell className="fs-sm" />
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.quota")}
          </Table.HeaderCell>
          <Table.NumberCell>
            <DisplayFraction id="quota" fraction={quota} />
          </Table.NumberCell>
          <Table.Cell className="fs-sm">{t("apportionment.quota_description")}</Table.Cell>
        </Table.Row>
        {preferenceThreshold && (
          <Table.Row>
            <Table.HeaderCell scope="row" className="normal">
              {t("apportionment.preference_threshold")}
            </Table.HeaderCell>
            <Table.NumberCell>
              <DisplayFraction id="quota" fraction={preferenceThreshold.number_of_votes} />
            </Table.NumberCell>
            <Table.Cell className="fs-sm">
              {t("apportionment.preference_threshold_description", { percentage: preferenceThreshold.percentage })}
            </Table.Cell>
          </Table.Row>
        )}
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("apportionment.candidates_for_apportionment")}
          </Table.HeaderCell>
          <Table.NumberCell>
            {formatNumber(deceasedCandidatesInfo.numberOfCandidates)} -{" "}
            {deceasedCandidatesInfo.numberOfDeceasedCandidates}
            <span className="superscript">&nbsp;&dagger;</span> ={" "}
            {formatNumber(
              deceasedCandidatesInfo.numberOfCandidates - deceasedCandidatesInfo.numberOfDeceasedCandidates,
            )}
          </Table.NumberCell>
          <Table.Cell className="fs-sm">
            <Button.Link variant="underlined" size="md" to={deceasedCandidatesInfo.deceasedCandidatesLink}>
              {t("apportionment.manage_deceased_candidates")}
            </Button.Link>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}
