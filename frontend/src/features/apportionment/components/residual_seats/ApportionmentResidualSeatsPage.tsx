import { Link } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/lib/i18n";
import { SeatChangeStep } from "@/types/generated/openapi";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import {
  getAssignedSeat,
  isAbsoluteMajorityReassignmentStep,
  isHighestAverageAssignmentStep,
  isLargestRemainderAssignmentStep,
  isListExhaustionRemovalStep,
} from "../../utils/seat-change";
import cls from "../Apportionment.module.css";
import { ApportionmentError } from "../ApportionmentError";
import { HighestAveragesFor19OrMoreSeatsTable } from "./HighestAveragesFor19OrMoreSeatsTable";
import { HighestAveragesForLessThan19SeatsTable } from "./HighestAveragesForLessThan19SeatsTable";
import { LargestRemaindersTable } from "./LargestRemaindersTable";

function render_title_and_header() {
  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("apportionment.details_residual_seats")}</h1>
        </section>
      </header>
    </>
  );
}

function render_information(seats: number, residualSeats: number) {
  return (
    <span className={cls.tableInformation}>
      {tx(
        `apportionment.full_seats_information_link.${residualSeats === 1 ? "singular" : "plural"}`,
        {
          link: (title) => <Link to="../details-full-seats">{title}</Link>,
        },
        { num_residual_seats: residualSeats },
      )}
      <br />
      <br />
      {tx(`apportionment.information_${seats >= 19 ? "highest_averages" : "largest_remainders"}`)}
    </span>
  );
}

export function ApportionmentResidualSeatsPage() {
  const { election } = useElection();
  const { seatAssignment, error } = useApportionmentContext();

  if (error) {
    return (
      <>
        {render_title_and_header()}
        <main>
          <article>
            <ApportionmentError error={error} />
          </article>
        </main>
      </>
    );
  }
  if (seatAssignment) {
    const largestRemainderSteps = seatAssignment.steps.filter(isLargestRemainderAssignmentStep);
    const highestAverageSteps = seatAssignment.steps.filter(isHighestAverageAssignmentStep);
    const absoluteMajorityReassignment = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
    const listExhaustionSteps = seatAssignment.steps.filter(isListExhaustionRemovalStep);
    const assignmentStepsAfterListExhaustion = seatAssignment.steps.slice(-listExhaustionSteps.length);
    return (
      <>
        {render_title_and_header()}
        <main>
          <article className={cls.article}>
            {seatAssignment.residual_seats > 0 ? (
              <>
                {seatAssignment.seats >= 19 ? (
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_highest_averages")}</h2>
                    {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
                    {highestAverageSteps.length > 0 && (
                      <HighestAveragesFor19OrMoreSeatsTable
                        steps={highestAverageSteps}
                        finalStanding={seatAssignment.final_standing}
                        politicalGroups={election.political_groups}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_remainders")}</h2>
                      {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
                      {largestRemainderSteps.length > 0 && (
                        <LargestRemaindersTable
                          steps={largestRemainderSteps}
                          finalStanding={seatAssignment.final_standing}
                          politicalGroups={election.political_groups}
                        />
                      )}
                    </div>
                    {highestAverageSteps.length > 0 && (
                      <div>
                        <h2 className={cls.tableTitle}>{t("apportionment.remaining_residual_seats_assignment")}</h2>
                        <span className={cls.tableInformation}>
                          {t(
                            `apportionment.remaining_residual_seats_amount_and_information.${highestAverageSteps.length === 1 ? "singular" : "plural"}`,
                            { num_seats: highestAverageSteps.length },
                          )}
                        </span>
                        {
                          <HighestAveragesForLessThan19SeatsTable
                            steps={highestAverageSteps}
                            finalStanding={seatAssignment.final_standing}
                            politicalGroups={election.political_groups}
                          />
                        }
                      </div>
                    )}
                  </>
                )}
                <div>
                  {absoluteMajorityReassignment && (
                    <div className="mb-md w-39">
                      <span id="absolute-majority-reassignment-information">
                        {t("apportionment.absolute_majority_reassignment", {
                          pg_assigned_seat: absoluteMajorityReassignment.change.pg_assigned_seat,
                          pg_retracted_seat: absoluteMajorityReassignment.change.pg_retracted_seat,
                        })}
                      </span>
                    </div>
                  )}
                  {listExhaustionSteps.map((pg_seat_removal, index) => (
                    <div className="mb-md w-39" key={`step-${index + 1}`}>
                      <span id={`list-exhaustion-step-${index + 1}-information`}>
                        {t("apportionment.list_exhaustion_removal", {
                          pg_retracted_seat: pg_seat_removal.change.pg_retracted_seat,
                          pg_assigned_seat:
                            getAssignedSeat(assignmentStepsAfterListExhaustion[index] as SeatChangeStep) || "",
                        })}
                        {index == 0 && ` ${t("apportionment.article_p10")}`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <span>{t("apportionment.no_residual_seats_to_assign")}</span>
            )}
          </article>
        </main>
      </>
    );
  }
}
