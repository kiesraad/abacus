import { Link } from "react-router";

import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";

import { useApportionmentContext } from "../hooks/useApportionmentContext";
import { render_title_and_header } from "../utils/utils";
import cls from "./Apportionment.module.css";
import { ApportionmentError } from "./ApportionmentError";
import { ApportionmentTable } from "./ApportionmentTable";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";
import { ElectionSummaryTable } from "./ElectionSummaryTable";

function get_number_of_seats_assigned_sentence(seats: number, type: "residual_seat" | "full_seat"): string {
  return t(`apportionment.seats_assigned.${seats === 1 ? "singular" : "plural"}`, {
    num_seat: seats,
    type_seat: t(`apportionment.${type}.singular`).toLowerCase(),
  });
}

export function ApportionmentPage() {
  const { committeeSession, election } = useElection();
  const { seatAssignment, candidateNomination, electionSummary, error } = useApportionmentContext();

  return (
    <>
      {render_title_and_header(t("apportionment.title"))}
      <main>
        <article className={cls.article}>
          {error ? (
            <ApportionmentError error={error} />
          ) : (
            seatAssignment &&
            candidateNomination &&
            electionSummary && (
              <>
                <div className={cn(cls.tableDiv, "mb-lg")}>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.election_summary")}</h2>
                    <ElectionSummaryTable
                      votesCounts={electionSummary.votes_counts}
                      seats={seatAssignment.seats}
                      quota={seatAssignment.quota}
                      numberOfVoters={committeeSession.number_of_voters}
                      preferenceThreshold={candidateNomination.preference_threshold}
                    />
                  </div>
                </div>
                <div className={cn(cls.tableDiv, "mb-lg")}>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.title")}</h2>
                    <ApportionmentTable
                      finalStanding={seatAssignment.final_standing}
                      politicalGroups={election.political_groups}
                      fullSeats={seatAssignment.full_seats}
                      residualSeats={seatAssignment.residual_seats}
                      seats={seatAssignment.seats}
                    />
                  </div>
                  <div className={cls.footnoteDiv}>
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
                </div>
                <div className={cn(cls.tableDiv, "mb-lg")}>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.chosen_candidates")}</h2>
                    <span className={cls.tableInformation}>{t("apportionment.in_alphabetical_order")}</span>
                    <ChosenCandidatesTable chosenCandidates={candidateNomination.chosen_candidates} />
                  </div>
                </div>
              </>
            )
          )}
        </article>
      </main>
    </>
  );
}
