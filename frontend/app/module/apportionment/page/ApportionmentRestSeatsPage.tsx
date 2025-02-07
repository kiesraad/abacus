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

  function render_largest_averages_table_19_or_more_seats() {
    const highest_average_steps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestAverage");
    if (highest_average_steps.length > 0) {
      return (
        <Table id="details_largest_averages" className={cn(cls.table, cls.rest_seats_table_19_or_more_seats)}>
          <Table.Header>
            <Table.Column>{t("list")}</Table.Column>
            <Table.Column>{t("list_name")}</Table.Column>
            {highest_average_steps.map((step: ApportionmentStep) => {
              return (
                <Table.Column key={step.rest_seat_number} className="text-align-r">
                  {t("apportionment.rest_seat.singular")} {step.rest_seat_number}
                </Table.Column>
              );
            })}
            <Table.Column className="text-align-r">{t("apportionment.rest_seats_count")}</Table.Column>
          </Table.Header>
          <Table.Body>
            {apportionment.final_standing.map((pg_seat_assignment: PoliticalGroupSeatAssignment) => {
              return (
                <Table.Row key={pg_seat_assignment.pg_number}>
                  <Table.Cell className={cn(cls.listNumberColumn, "font-number")}>
                    {pg_seat_assignment.pg_number}
                  </Table.Cell>
                  <Table.Cell>{election.political_groups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
                  {highest_average_steps.map((step: ApportionmentStep) => {
                    const average = step.standing[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
                    if (average) {
                      return (
                        <Table.NumberCell
                          key={`${pg_seat_assignment.pg_number}-${step.rest_seat_number}`}
                          className={
                            step.change.pg_options.includes(pg_seat_assignment.pg_number) ? "bg-yellow" : "normal"
                          }
                        >
                          <DisplayFraction fraction={average} />
                        </Table.NumberCell>
                      );
                    }
                  })}
                  <Table.NumberCell>{pg_seat_assignment.rest_seats}</Table.NumberCell>
                </Table.Row>
              );
            })}
            <Table.TotalRow>
              <Table.Cell />
              <Table.Cell className="text-align-r">{t("apportionment.rest_seat_assigned_to_list")}</Table.Cell>
              {highest_average_steps.map((step: ApportionmentStep) => {
                return (
                  <Table.NumberCell key={step.rest_seat_number} className="text-align-r">
                    {step.change.selected_pg_number}
                  </Table.NumberCell>
                );
              })}
              <Table.Cell />
            </Table.TotalRow>
          </Table.Body>
        </Table>
      );
    }
  }

  function render_largest_surpluses_table() {
    const final_standing_pgs_meeting_threshold = apportionment.final_standing.filter(
      (pg_seat_assignment) => pg_seat_assignment.meets_surplus_threshold,
    );
    const highest_surplus_steps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestSurplus");
    if (highest_surplus_steps.length > 0) {
      return (
        <Table id="details_largest_surpluses" className={cn(cls.table, cls.rest_seats_table_less_than_19_seats)}>
          <Table.Header>
            <Table.Column>{t("list")}</Table.Column>
            <Table.Column>{t("list_name")}</Table.Column>
            <Table.Column className="text-align-r">{t("apportionment.whole_seats_count")}</Table.Column>
            <Table.Column className="text-align-r">{t("apportionment.surplus")}</Table.Column>
            <Table.Column className="text-align-r">{t("apportionment.rest_seats_count")}</Table.Column>
          </Table.Header>
          <Table.Body>
            {final_standing_pgs_meeting_threshold.map((pg_seat_assignment) => {
              const rest_seats =
                highest_surplus_steps.filter((step) => step.change.selected_pg_number == pg_seat_assignment.pg_number)
                  .length || 0;
              return (
                <Table.Row key={pg_seat_assignment.pg_number}>
                  <Table.Cell className={cn(cls.listNumberColumn, "font-number")}>
                    {pg_seat_assignment.pg_number}
                  </Table.Cell>
                  <Table.Cell>{election.political_groups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
                  <Table.NumberCell>{pg_seat_assignment.whole_seats}</Table.NumberCell>
                  <Table.NumberCell className="normal">
                    <DisplayFraction fraction={pg_seat_assignment.surplus_votes} />
                  </Table.NumberCell>
                  <Table.NumberCell>{rest_seats}</Table.NumberCell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      );
    }
  }

  function render_largest_averages_table_less_than_19_seats() {
    const highest_average_steps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestAverage");

    if (highest_average_steps.length > 0) {
      return (
        <Table id="details_largest_averages" className={cn(cls.table, cls.rest_seats_table_less_than_19_seats)}>
          <Table.Header>
            <Table.Column>{t("list")}</Table.Column>
            <Table.Column>{t("list_name")}</Table.Column>
            <Table.Column className="text-align-r">{t("apportionment.whole_seats_count")}</Table.Column>
            <Table.Column className="text-align-r">{t("apportionment.average")}</Table.Column>
            <Table.Column className="text-align-r">{t("apportionment.rest_seats_count")}</Table.Column>
          </Table.Header>
          <Table.Body>
            {apportionment.final_standing.map((pg_seat_assignment) => {
              const average = highest_average_steps[0]?.standing[pg_seat_assignment.pg_number - 1]?.next_votes_per_seat;
              const rest_seats = highest_average_steps.filter(
                (step) => step.change.selected_pg_number == pg_seat_assignment.pg_number,
              ).length;
              return (
                <Table.Row key={pg_seat_assignment.pg_number}>
                  <Table.Cell className={cn(cls.listNumberColumn, "font-number")}>
                    {pg_seat_assignment.pg_number}
                  </Table.Cell>
                  <Table.Cell>{election.political_groups[pg_seat_assignment.pg_number - 1]?.name || ""}</Table.Cell>
                  <Table.NumberCell>{pg_seat_assignment.whole_seats}</Table.NumberCell>
                  <Table.NumberCell className="normal">
                    {average && <DisplayFraction fraction={average} />}
                  </Table.NumberCell>
                  <Table.NumberCell>{rest_seats}</Table.NumberCell>
                </Table.Row>
              );
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
          {apportionment.rest_seats > 0 ? (
            apportionment.seats >= 19 ? (
              <div>
                <h2 className={cls.table_title}>{t("apportionment.rest_seats_largest_averages")}</h2>
                {render_information(apportionment.seats)}
                {render_largest_averages_table_19_or_more_seats()}
              </div>
            ) : (
              <div>
                <h2 className={cls.table_title}>{t("apportionment.rest_seats_largest_surpluses")}</h2>
                {render_information(apportionment.seats)}
                {render_largest_surpluses_table()}
                {/* TODO: If also largest averages system is used, add extra information text */}
                {render_largest_averages_table_less_than_19_seats()}
              </div>
            )
          ) : (
            <span>{t("apportionment.no_rest_seats_to_assign")}</span>
          )}
        </article>
      </main>
    </>
  );
}
