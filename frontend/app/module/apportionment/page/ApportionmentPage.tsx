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
                  <Table.Cell>{t("apportionment.voters")}</Table.Cell>
                  <Table.NumberCell>
                    {election.number_of_voters ? formatNumber(election.number_of_voters) : ""}
                  </Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.total_votes_cast_count")}</Table.Cell>
                  <Table.NumberCell>
                    {formatNumber(election_summary.votes_counts.total_votes_cast_count)}
                  </Table.NumberCell>
                  <Table.Cell>
                    {election.number_of_voters
                      ? `${t("apportionment.turnout")}: ${(election_summary.votes_counts.total_votes_cast_count / election.number_of_voters) * 100}%`
                      : ""}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("voters_and_votes.blank_votes_count")}</Table.Cell>
                  <Table.NumberCell>{formatNumber(election_summary.votes_counts.blank_votes_count)}</Table.NumberCell>
                  <Table.Cell>
                    {`${Number((election_summary.votes_counts.blank_votes_count / election_summary.votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("voters_and_votes.invalid_votes_count")}</Table.Cell>
                  <Table.NumberCell>{formatNumber(election_summary.votes_counts.invalid_votes_count)}</Table.NumberCell>
                  <Table.Cell>
                    {`${Number((election_summary.votes_counts.invalid_votes_count / election_summary.votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("voters_and_votes.votes_candidates_count")}</Table.Cell>
                  <Table.NumberCell>
                    {formatNumber(election_summary.votes_counts.votes_candidates_count)}
                  </Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.number_of_seats")}</Table.Cell>
                  <Table.NumberCell>{apportionment.seats}</Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.quota")}</Table.Cell>
                  <Table.NumberCell className="w-13">
                    <DisplayFraction fraction={apportionment.quota} />
                  </Table.NumberCell>
                  <Table.Cell>{t("apportionment.quota_description")}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.preference_threshold")}</Table.Cell>
                  <Table.NumberCell>{/* TODO: Add apportionment.preference_threshold */}</Table.NumberCell>
                  <Table.Cell>{t("apportionment.preference_threshold_description")}</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </div>

          <div>
            <h2 className={cls.table_title}>{t("apportionment.title")}</h2>
            <Table id="apportionment" className={cn(cls.table, cls.apportionment_table)}>
              <Table.Header>
                <Table.Column>{t("list")}</Table.Column>
                <Table.Column>{t("party_name")}</Table.Column>
                <Table.Column>{t("apportionment.whole_seat.plural")}</Table.Column>
                <Table.Column>{t("apportionment.rest_seat.plural")}</Table.Column>
                <Table.Column>{t("apportionment.total_seats")}</Table.Column>
                <Table.Column />
              </Table.Header>
              <Table.Body>
                {apportionment.final_standing.map((standing: PoliticalGroupSeatAssignment) => {
                  return (
                    /* TODO: Add row link */
                    <Table.LinkRow key={standing.pg_number} to=".">
                      <Table.Cell>{standing.pg_number}</Table.Cell>
                      <Table.Cell>{election.political_groups[standing.pg_number - 1]?.name || ""}</Table.Cell>
                      <Table.NumberCell>{convert_zero_to_dash(standing.whole_seats)}</Table.NumberCell>
                      <Table.NumberCell>{convert_zero_to_dash(standing.rest_seats)}</Table.NumberCell>
                      <Table.NumberCell>{convert_zero_to_dash(standing.total_seats)}</Table.NumberCell>
                      <Table.Cell />
                    </Table.LinkRow>
                  );
                })}
                <Table.Row>
                  <Table.Cell />
                  <Table.Cell>{t("apportionment.total")}</Table.Cell>
                  <Table.NumberCell>{apportionment.whole_seats}</Table.NumberCell>
                  <Table.NumberCell>{apportionment.rest_seats}</Table.NumberCell>
                  <Table.NumberCell>{apportionment.seats}</Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
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
