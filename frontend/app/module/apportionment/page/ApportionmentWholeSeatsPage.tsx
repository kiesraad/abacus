import { Link } from "react-router";

import { PoliticalGroupSeatAssignment, useApportionment } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { DisplayFraction, PageTitle, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./ApportionmentPage.module.css";

export function ApportionmentWholeSeatsPage() {
  const { apportionment, election_summary } = useApportionment();

  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("apportionment.details_whole_seats")}</h1>
        </section>
      </header>
      <main>
        <article className={cls.article}>
          <div>
            <h2 className={cls.table_title}>{t("apportionment.how_often_is_quota_met")}</h2>
            <span className={cls.table_information}>{t("apportionment.whole_seats_information")}</span>
            <Table id="details_whole_seats_table" className={cn(cls.table, cls.details_whole_seats_table)}>
              <Table.Header>
                <Table.Column>{t("list")}</Table.Column>
                <Table.Column>{t("vote_count")}</Table.Column>
                <Table.Column>:</Table.Column>
                <Table.Column>{t("apportionment.quota")}</Table.Column>
                <Table.Column>=</Table.Column>
                <Table.Column>{t("apportionment.whole_seats_count")}</Table.Column>
              </Table.Header>
              <Table.Body>
                {apportionment.final_standing.map((standing: PoliticalGroupSeatAssignment) => {
                  return (
                    <Table.Row key={standing.pg_number}>
                      <Table.Cell>{standing.pg_number}</Table.Cell>
                      <Table.NumberCell>
                        {election_summary.political_group_votes[standing.pg_number - 1]?.total || ""}
                      </Table.NumberCell>
                      <Table.Cell>:</Table.Cell>
                      <Table.NumberCell>
                        <DisplayFraction fraction={apportionment.quota} />
                      </Table.NumberCell>
                      <Table.Cell>=</Table.Cell>
                      <Table.NumberCell>{standing.whole_seats}</Table.NumberCell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </div>

          <div>
            <h2 className={cls.table_title}>{t("apportionment.how_many_rest_seats")}</h2>
            <span className={cls.table_information}>
              {tx(
                `apportionment.rest_seats_information_amount_and_link.${apportionment.rest_seats > 1 ? "plural" : "singular"}`,
                {
                  link: (title) => <Link to="../details-rest-seats">{title}</Link>,
                },
                { num_rest_seats: apportionment.rest_seats },
              )}{" "}
              {t(
                `apportionment.rest_seats_information_largest_${apportionment.seats >= 19 ? "averages" : "surpluses"}`,
              )}
            </span>
            <Table id="calculation_rest_seats" className={cn(cls.table, cls.calculation_rest_seats)}>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>{t("apportionment.total_number_seats")}</Table.Cell>
                  <Table.NumberCell>{apportionment.seats}</Table.NumberCell>
                  <Table.Cell />
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.total_number_assigned_whole_seats")}</Table.Cell>
                  <Table.NumberCell>{apportionment.whole_seats}</Table.NumberCell>
                  <Table.Cell>— {t("apportionment.minus")}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>{t("apportionment.rest_seat.plural")}</Table.Cell>
                  <Table.NumberCell>{apportionment.rest_seats}</Table.NumberCell>
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
