import { Link } from "react-router";

import { ApportionmentTable, ElectionSummaryTable } from "app/component/apportionment";

import { useApportionmentContext, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, FormLayout, PageTitle } from "@kiesraad/ui";

import cls from "./Apportionment.module.css";

function get_number_of_seats_assigned_sentence(seats: number, type: "rest_seat" | "whole_seat"): string {
  return t(`apportionment.seats_assigned.${seats > 1 ? "plural" : "singular"}`, {
    num_seat: seats,
    type_seat: t(`apportionment.${type}.singular`).toLowerCase(),
  });
}

export function ApportionmentPage() {
  const { election } = useElection();
  const { apportionment, election_summary, error } = useApportionmentContext();

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
          {error ? (
            <FormLayout.Alert>
              <Alert type="error">
                <h2>{t("apportionment.not_available")}</h2>
                <p>{t(`error.api_error.${error.reference}`)}</p>
              </Alert>
            </FormLayout.Alert>
          ) : (
            apportionment &&
            election_summary && (
              <>
                <div>
                  <h2 className={cls.table_title}>{t("apportionment.election_summary")}</h2>
                  <ElectionSummaryTable
                    votes_counts={election_summary.votes_counts}
                    seats={apportionment.seats}
                    quota={apportionment.quota}
                    number_of_voters={election.number_of_voters}
                  />
                </div>
                <div>
                  <h2 className={cls.table_title}>{t("apportionment.title")}</h2>
                  <ApportionmentTable
                    final_standing={apportionment.final_standing}
                    political_groups={election.political_groups}
                    whole_seats={apportionment.whole_seats}
                    rest_seats={apportionment.rest_seats}
                    seats={apportionment.seats}
                  />
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
              </>
            )
          )}
        </article>
      </main>
    </>
  );
}
