import { Link } from "react-router";

import { ApportionmentStep, PoliticalGroupSeatAssignment, useApportionment, useElection } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { DisplayFraction, PageTitle, Table } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./ApportionmentPage.module.css";

export function ApportionmentRestSeatsPage() {
  const { election } = useElection();
  const { apportionment } = useApportionment();

  function render_information(seats: number) {
    return (
      <span className={cls.table_information}>
        {tx(
          `apportionment.whole_seats_information_link.${apportionment.rest_seats > 1 ? "plural" : "singular"}`,
          {
            link: (title) => <Link to="../details-whole-seats">{title}</Link>,
          },
          { num_rest_seats: apportionment.rest_seats },
        )}
        <br />
        <br />
        {tx(`apportionment.information_largest_${seats >= 19 ? "averages" : "surpluses"}`)}
      </span>
    );
  }

  function render_largest_averages_table() {
    const highest_average_steps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestAverage");
    if (highest_average_steps.length > 0) {
      return (
        <Table id="details_largest_averages" className={cn(cls.table, cls.largest_averages_table)}>
          <Table.Header>
            <Table.Column>{t("list")}</Table.Column>
            <Table.Column>{t("party_name")}</Table.Column>
            {highest_average_steps.map((step: ApportionmentStep) => {
              return (
                <Table.Column key={step.rest_seat_number}>
                  {t("apportionment.rest_seat.singular")} {step.rest_seat_number}
                </Table.Column>
              );
            })}
            <Table.Column>{t("apportionment.rest_seats_count")}</Table.Column>
          </Table.Header>
          <Table.Body>
            {apportionment.final_standing.map((final_standing: PoliticalGroupSeatAssignment) => {
              return (
                <Table.Row key={final_standing.pg_number}>
                  <Table.Cell>{final_standing.pg_number}</Table.Cell>
                  <Table.Cell>{election.political_groups[final_standing.pg_number - 1]?.name || ""}</Table.Cell>
                  {highest_average_steps.map((step: ApportionmentStep) => {
                    const average = step.standing[final_standing.pg_number - 1]?.next_votes_per_seat;
                    if (average) {
                      return (
                        <Table.NumberCell
                          key={`${final_standing.pg_number}-${step.rest_seat_number}`}
                          className={step.change.pg_options.includes(final_standing.pg_number) ? "bg-yellow bold" : ""}
                        >
                          <DisplayFraction fraction={average} />
                        </Table.NumberCell>
                      );
                    }
                  })}
                  <Table.NumberCell>{final_standing.rest_seats}</Table.NumberCell>
                </Table.Row>
              );
            })}
            <Table.Row>
              <Table.Cell />
              <Table.Cell>{t("apportionment.rest_seat_assigned_to_list")}</Table.Cell>
              {highest_average_steps.map((step: ApportionmentStep) => {
                return (
                  <Table.NumberCell key={step.rest_seat_number}>{step.change.selected_pg_number}</Table.NumberCell>
                );
              })}
              <Table.Cell />
            </Table.Row>
          </Table.Body>
        </Table>
      );
    }
  }

  function render_largest_surpluses_table() {
    const highest_surplus_steps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestSurplus");
    if (highest_surplus_steps.length > 0) {
      return (
        <Table id="details_largest_surpluses" className={cn(cls.table, cls.largest_surpluses_table)}>
          <Table.Header>
            <Table.Column>{t("list")}</Table.Column>
            <Table.Column>{t("party_name")}</Table.Column>
            <Table.Column>{t("apportionment.whole_seats_count")}</Table.Column>
            <Table.Column>{t("apportionment.surplus")}</Table.Column>
            <Table.Column>{t("apportionment.rest_seats_count")}</Table.Column>
          </Table.Header>
          <Table.Body>
            {/* TODO: Sort the rows on pg_number */}
            {highest_surplus_steps.map((step: ApportionmentStep) => {
              const surplus = step.standing[step.change.selected_pg_number - 1]?.surplus_votes;
              if (surplus) {
                return (
                  <Table.Row key={step.change.selected_pg_number}>
                    <Table.Cell>{step.change.selected_pg_number}</Table.Cell>
                    <Table.Cell>{election.political_groups[step.change.selected_pg_number - 1]?.name || ""}</Table.Cell>
                    <Table.NumberCell>
                      {apportionment.final_standing[step.change.selected_pg_number - 1]?.whole_seats}
                    </Table.NumberCell>
                    <Table.NumberCell>
                      <DisplayFraction fraction={surplus} />
                    </Table.NumberCell>
                    <Table.NumberCell>1</Table.NumberCell>
                  </Table.Row>
                );
              }
            })}
          </Table.Body>
        </Table>
      );
    }
  }

  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("apportionment.details_rest_seats")}</h1>
        </section>
      </header>
      <main>
        <article className={cls.article}>
          {apportionment.seats >= 19 ? (
            <div>
              <h2 className={cls.table_title}>{t("apportionment.rest_seats_largest_averages")}</h2>
              {render_information(apportionment.seats)}
              {render_largest_averages_table()}
            </div>
          ) : (
            <div>
              <h2 className={cls.table_title}>{t("apportionment.rest_seats_largest_surpluses")}</h2>
              {render_information(apportionment.seats)}
              {render_largest_surpluses_table()}
              {/* TODO: If also largest averages system is used, add extra information text */}
              {/* TODO: {render_largest_averages_table()} */}
            </div>
          )}
        </article>
      </main>
    </>
  );
}
