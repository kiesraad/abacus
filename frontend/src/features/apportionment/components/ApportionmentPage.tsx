import { Link } from "react-router";

import { useElection } from "@/api";
import { Alert, FormLayout, PageTitle } from "@/components/ui";
import { t } from "@/lib/i18n";

import { useApportionmentContext } from "../hooks/useApportionmentContext";
import cls from "./Apportionment.module.css";
import { ApportionmentTable } from "./ApportionmentTable";
import { ElectionSummaryTable } from "./ElectionSummaryTable";

function get_number_of_seats_assigned_sentence(seats: number, type: "residual_seat" | "full_seat"): string {
  return t(`apportionment.seats_assigned.${seats > 1 ? "plural" : "singular"}`, {
    num_seat: seats,
    type_seat: t(`apportionment.${type}.singular`).toLowerCase(),
  });
}

export function ApportionmentPage() {
  const { election } = useElection();
  const { seatAssignment, electionSummary, error } = useApportionmentContext();

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
            seatAssignment &&
            electionSummary && (
              <>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.election_summary")}</h2>
                  <ElectionSummaryTable
                    votesCounts={electionSummary.votes_counts}
                    seats={seatAssignment.seats}
                    quota={seatAssignment.quota}
                    numberOfVoters={election.number_of_voters}
                  />
                </div>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.title")}</h2>
                  <ApportionmentTable
                    finalStanding={seatAssignment.final_standing}
                    politicalGroups={election.political_groups}
                    fullSeats={seatAssignment.full_seats}
                    residualSeats={seatAssignment.residual_seats}
                    seats={seatAssignment.seats}
                  />
                  <ul>
                    <li>
                      {get_number_of_seats_assigned_sentence(seatAssignment.full_seats, "full_seat")} (
                      <Link to="./details-full-seats">{t("apportionment.view_details")}</Link>)
                    </li>
                    <li>
                      {get_number_of_seats_assigned_sentence(seatAssignment.residual_seats, "residual_seat")} (
                      <Link to="./details-residual-seats">{t("apportionment.view_details")}</Link>)
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
