import { Link } from "react-router";

import { PoliticalGroupSeatAssignment, useApportionment, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { DisplayFraction, PageTitle, Table } from "@kiesraad/ui";
import { cn, formatNumber } from "@kiesraad/util";

import cls from "./ApportionmentPage.module.css";

function convert_zero_to_dash(number: number): string {
  if (number === 0) {
    return "-";
  }
  return number.toString();
}

function get_number_of_seats_assigned_sentence(seats: number, type: "rest_seat" | "whole_seat"): string {
  return t(`apportionment.seats_assigned.${seats > 1 ? "plural" : "singular"}`, {
    num_seat: seats,
    type_seat: t(`apportionment.${type}.singular`).toLowerCase(),
  });
}

export function ApportionmentPage() {
  const { election } = useElection();
  const { apportionment, election_summary } = useApportionment();

  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("apportionment.title")}</h1>
        </section>
      </header>
      <main>
        <article className={cls.article}>
          <div>
            <h2 className={cls.table_title}>{t("apportionment.election_summary")}</h2>
            <Table id="election_summary" className={cn(cls.table, cls.election_summary_table)}>
              <Table.Body>
                <Table.Row>
                  <Table.Column scope="row" className={cls.bt1Gray}>
                    {t("apportionment.voters")}
                  </Table.Column>
                  <Table.NumberCell className={cn(cls.bt1Gray, "font-number", "text-align-r", "normal")}>
                    {election.number_of_voters ? formatNumber(election.number_of_voters) : ""}
                  </Table.NumberCell>
                  <Table.Cell className={cn(cls.bt1Gray, "fs-sm")} />
                </Table.Row>
                <Table.Row>
                  <Table.Column scope="row">{t("apportionment.total_votes_cast_count")}</Table.Column>
                  <Table.NumberCell className="font-number text-align-r normal">
                    {formatNumber(election_summary.votes_counts.total_votes_cast_count)}
                  </Table.NumberCell>
                  <Table.Cell className="fs-sm">
                    {election.number_of_voters
                      ? `${t("apportionment.turnout")}: ${Number((election_summary.votes_counts.total_votes_cast_count / election.number_of_voters) * 100).toFixed(2)}%`
                      : ""}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Column scope="row">{t("voters_and_votes.blank_votes_count")}</Table.Column>
                  <Table.NumberCell className="font-number text-align-r normal">
                    {formatNumber(election_summary.votes_counts.blank_votes_count)}
                  </Table.NumberCell>
                  <Table.Cell className="fs-sm">
                    {`${Number((election_summary.votes_counts.blank_votes_count / election_summary.votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Column scope="row">{t("voters_and_votes.invalid_votes_count")}</Table.Column>
                  <Table.NumberCell className="font-number text-align-r normal">
                    {formatNumber(election_summary.votes_counts.invalid_votes_count)}
                  </Table.NumberCell>
                  <Table.Cell className="fs-sm">
                    {`${Number((election_summary.votes_counts.invalid_votes_count / election_summary.votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Column scope="row">{t("voters_and_votes.votes_candidates_count")}</Table.Column>
                  <Table.NumberCell className="font-number text-align-r normal">
                    {formatNumber(election_summary.votes_counts.votes_candidates_count)}
                  </Table.NumberCell>
                  <Table.Cell className="fs-sm" />
                </Table.Row>
                <Table.Row>
                  <Table.Column scope="row">{t("apportionment.number_of_seats")}</Table.Column>
                  <Table.NumberCell className="font-number text-align-r normal">{apportionment.seats}</Table.NumberCell>
                  <Table.Cell className="fs-sm" />
                </Table.Row>
                <Table.Row>
                  <Table.Column scope="row">{t("apportionment.quota")}</Table.Column>
                  <Table.NumberCell className="font-number text-align-r normal">
                    <DisplayFraction id="quota" fraction={apportionment.quota} />
                  </Table.NumberCell>
                  <Table.Cell className="fs-sm">{t("apportionment.quota_description")}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Column scope="row">{t("apportionment.preference_threshold")}</Table.Column>
                  <Table.NumberCell className="font-number text-align-r normal">
                    {/* TODO: Add apportionment.preference_threshold */}
                  </Table.NumberCell>
                  <Table.Cell className="fs-sm">{t("apportionment.preference_threshold_description")}</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </div>

          <div>
            <h2 className={cls.table_title}>{t("apportionment.title")}</h2>
            <Table id="apportionment" className={cn(cls.table, cls.apportionment_table)}>
              <Table.Header>
                <Table.Column className="text-align-r">{t("list")}</Table.Column>
                <Table.Column>{t("list_name")}</Table.Column>
                <Table.Column className="text-align-r">{t("apportionment.whole_seat.plural")}</Table.Column>
                <Table.Column className="text-align-r">{t("apportionment.rest_seat.plural")}</Table.Column>
                <Table.Column className="text-align-r">{t("apportionment.total_seats")}</Table.Column>
                <Table.Column />
              </Table.Header>
              <Table.Body>
                {apportionment.final_standing.map((standing: PoliticalGroupSeatAssignment) => {
                  return (
                    /* TODO: Add row link */
                    <Table.LinkRow key={standing.pg_number} to=".">
                      <Table.Cell className={cn(cls.listNumberColumn, "text-align-r", "font-number")}>
                        {standing.pg_number}
                      </Table.Cell>
                      <Table.Cell>{election.political_groups[standing.pg_number - 1]?.name || ""}</Table.Cell>
                      <Table.NumberCell className="text-align-r font-number normal">
                        {convert_zero_to_dash(standing.whole_seats)}
                      </Table.NumberCell>
                      <Table.NumberCell className="text-align-r font-number normal">
                        {convert_zero_to_dash(standing.rest_seats)}
                      </Table.NumberCell>
                      <Table.NumberCell className="text-align-r font-number">
                        {convert_zero_to_dash(standing.total_seats)}
                      </Table.NumberCell>
                      <Table.Cell />
                    </Table.LinkRow>
                  );
                })}
                <Table.TotalRow>
                  <Table.Cell />
                  <Table.Cell className="text-align-r bold">{t("apportionment.total")}</Table.Cell>
                  <Table.NumberCell className="font-number text-align-r">{apportionment.whole_seats}</Table.NumberCell>
                  <Table.NumberCell className="font-number text-align-r">{apportionment.rest_seats}</Table.NumberCell>
                  <Table.NumberCell className="font-number text-align-r">{apportionment.seats}</Table.NumberCell>
                  <Table.Cell />
                </Table.TotalRow>
              </Table.Body>
            </Table>
            <ul>
              <li>
                {get_number_of_seats_assigned_sentence(apportionment.whole_seats, "whole_seat")} (
                <Link to="./details-whole-seats">{t("apportionment.view_details")}</Link>)
              </li>
              <li>
                {get_number_of_seats_assigned_sentence(apportionment.rest_seats, "rest_seat")} (
                <Link to="./details-rest-seats">{t("apportionment.view_details")}</Link>)
              </li>
            </ul>
          </div>
        </article>
      </main>
    </>
  );
}
