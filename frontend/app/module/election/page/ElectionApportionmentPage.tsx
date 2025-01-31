import { Link } from "react-router";

import { NavBar } from "app/component/navbar/NavBar";

import { PoliticalGroupSeatAssignment, useElection, useElectionApportionment } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { PageTitle, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./ElectionApportionmentPage.module.css";

export function ElectionApportionmentPage() {
  const { election } = useElection();
  const { apportionment, election_summary } = useElectionApportionment();

  let whole_seats = 0;
  let rest_seats = 0;

  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <NavBar>
        <Link to={`/elections/${election.id}#coordinator`}>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </Link>
      </NavBar>
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
                  <Table.NumberCell>{election.number_of_voters ? election.number_of_voters : ""}</Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.total_votes_cast_count")}</Table.Cell>
                  <Table.NumberCell>{election_summary.votes_counts.total_votes_cast_count}</Table.NumberCell>
                  <Table.Cell>
                    {election.number_of_voters
                      ? `${t("apportionment.turnout")}: ${(election_summary.votes_counts.total_votes_cast_count / election.number_of_voters) * 100}%`
                      : ""}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("voters_and_votes.blank_votes_count")}</Table.Cell>
                  <Table.NumberCell>{election_summary.votes_counts.blank_votes_count}</Table.NumberCell>
                  <Table.Cell>
                    {`${Number((election_summary.votes_counts.blank_votes_count / election_summary.votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("voters_and_votes.invalid_votes_count")}</Table.Cell>
                  <Table.NumberCell>{election_summary.votes_counts.invalid_votes_count}</Table.NumberCell>
                  <Table.Cell>
                    {`${Number((election_summary.votes_counts.invalid_votes_count / election_summary.votes_counts.total_votes_cast_count) * 100).toFixed(2)}%`}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("voters_and_votes.votes_candidates_count")}</Table.Cell>
                  <Table.NumberCell>{election_summary.votes_counts.votes_candidates_count}</Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.number_of_seats")}</Table.Cell>
                  <Table.NumberCell>{apportionment.seats}</Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.quota")}</Table.Cell>
                  <Table.NumberCell className="w-13">{`${apportionment.quota.integer} ${apportionment.quota.numerator}/${apportionment.quota.denominator}`}</Table.NumberCell>
                  <Table.Cell>{t("apportionment.quota_description")}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.preference_threshold")}</Table.Cell>
                  <Table.NumberCell>{/*apportionment.preference_threshold*/}</Table.NumberCell>
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
                <Table.Column>{t("apportionment.whole_seats")}</Table.Column>
                <Table.Column>{t("apportionment.remainder_seats")}</Table.Column>
                <Table.Column>{t("apportionment.total_seats")}</Table.Column>
                <Table.Column />
              </Table.Header>
              <Table.Body>
                {apportionment.final_standing.map((standing: PoliticalGroupSeatAssignment) => {
                  whole_seats += standing.whole_seats;
                  rest_seats += standing.rest_seats;
                  return (
                    <Table.LinkRow to=".">
                      <Table.Cell>{standing.pg_number}</Table.Cell>
                      <Table.Cell>{election.political_groups[standing.pg_number - 1]?.name || ""}</Table.Cell>
                      <Table.NumberCell>{standing.whole_seats}</Table.NumberCell>
                      <Table.NumberCell>{standing.rest_seats}</Table.NumberCell>
                      <Table.NumberCell>{standing.total_seats}</Table.NumberCell>
                      <Table.Cell />
                    </Table.LinkRow>
                  );
                })}
                <Table.Row>
                  <Table.Cell />
                  <Table.Cell>{t("apportionment.total")}</Table.Cell>
                  <Table.NumberCell>{whole_seats}</Table.NumberCell>
                  <Table.NumberCell>{rest_seats}</Table.NumberCell>
                  <Table.NumberCell>{apportionment.seats}</Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
              </Table.Body>
            </Table>
          </div>
        </article>
      </main>
    </>
  );
}
