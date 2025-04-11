import { Link } from "react-router";

import { useElection } from "@/api/election/useElection";
import { SeatChangeStep } from "@/api/gen/openapi";
import { t, tx } from "@/lib/i18n";
import { cn } from "@/lib/util/classnames";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import {
  getAssignedSeat,
  isAbsoluteMajorityReassignmentStep,
  isHighestAverageAssignmentStep,
  isLargestRemainderAssignmentStep,
  isListExhaustionRemovalStep,
  isUniqueHighestAverageAssignmentStep,
  resultChange,
} from "../../utils/seat-change";
import { render_title_and_header } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentError } from "../ApportionmentError";
import { HighestAveragesTable } from "./HighestAveragesTable";
import { LargestRemaindersTable } from "./LargestRemaindersTable";
import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

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
        {render_title_and_header(t("apportionment.details_residual_seats"))}
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
    const uniqueHighestAverageSteps = seatAssignment.steps.filter(isUniqueHighestAverageAssignmentStep);
    const highestAverageSteps = seatAssignment.steps.filter(isHighestAverageAssignmentStep);
    const absoluteMajorityReassignment = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
    const listExhaustionSteps = seatAssignment.steps.filter(isListExhaustionRemovalStep);
    const residualSeatRemovalSteps = listExhaustionSteps.filter((step) => !step.change.full_seat);
    const assignmentStepsAfterListExhaustion = seatAssignment.steps.slice(-residualSeatRemovalSteps.length);
    const resultChanges: resultChange[] = [];
    if (absoluteMajorityReassignment) {
      resultChanges.push({
        pgNumber: absoluteMajorityReassignment.change.pg_assigned_seat,
        footnoteNumber: 1,
        increase: 1,
        decrease: 0,
      });
      resultChanges.push({
        pgNumber: absoluteMajorityReassignment.change.pg_retracted_seat,
        footnoteNumber: 1,
        increase: 0,
        decrease: 1,
      });
    }
    residualSeatRemovalSteps.forEach((step, index) => {
      const footnoteNumber = absoluteMajorityReassignment ? index + 2 : index + 1;
      resultChanges.push({
        pgNumber: step.change.pg_retracted_seat,
        footnoteNumber: footnoteNumber,
        increase: 0,
        decrease: 1,
      });
    });

    function render_footnotes() {
      return (
        <div className={cls.footnoteDiv}>
          {absoluteMajorityReassignment && (
            <div className="w-39">
              <span id="1-absolute-majority-reassignment-information">
                <sup id="footnote-1" className={cls.footnoteNumber}>
                  1
                </sup>{" "}
                {t("apportionment.absolute_majority_reassignment", {
                  pg_assigned_seat: absoluteMajorityReassignment.change.pg_assigned_seat,
                  pg_retracted_seat: absoluteMajorityReassignment.change.pg_retracted_seat,
                })}
              </span>
            </div>
          )}
          {residualSeatRemovalSteps.map((pgSeatRemoval, index) => {
            const footnoteNumber = absoluteMajorityReassignment ? index + 2 : index + 1;
            return (
              <div className="w-39" key={`step-${footnoteNumber}`}>
                <span id={`${footnoteNumber}-list-exhaustion-information`}>
                  <sup id={`footnote-${footnoteNumber}`} className={cls.footnoteNumber}>
                    {footnoteNumber}
                  </sup>{" "}
                  {t("apportionment.list_exhaustion_residual_seat_removal", {
                    pg_retracted_seat: pgSeatRemoval.change.pg_retracted_seat,
                    pg_assigned_seat:
                      getAssignedSeat(assignmentStepsAfterListExhaustion[index] as SeatChangeStep) || "",
                  })}
                  {index == 0 && ` ${t("apportionment.article_p10")}`}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <>
        {render_title_and_header(t("apportionment.details_residual_seats"))}
        <main>
          <article className={cls.article}>
            {seatAssignment.residual_seats > 0 ? (
              <>
                {seatAssignment.seats >= 19 ? (
                  <div className={cn(cls.tableDiv, "mb-lg")}>
                    <div>
                      <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_highest_averages")}</h2>
                      {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
                      {highestAverageSteps.length > 0 && (
                        <HighestAveragesTable
                          steps={highestAverageSteps}
                          finalStanding={seatAssignment.final_standing}
                          politicalGroups={election.political_groups}
                          resultChanges={resultChanges}
                        />
                      )}
                    </div>
                    {resultChanges.length > 0 && render_footnotes()}
                  </div>
                ) : (
                  <>
                    <div className={cn(cls.tableDiv, "mb-lg")}>
                      <div>
                        <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_remainders")}</h2>
                        {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
                        {largestRemainderSteps.length > 0 && (
                          <LargestRemaindersTable
                            steps={largestRemainderSteps}
                            finalStanding={seatAssignment.final_standing}
                            politicalGroups={election.political_groups}
                            resultChanges={resultChanges}
                          />
                        )}
                      </div>
                      {uniqueHighestAverageSteps.length === 0 && resultChanges.length > 0 && render_footnotes()}
                    </div>
                    {uniqueHighestAverageSteps.length > 0 && (
                      <div className={cn(cls.tableDiv, "mb-lg")}>
                        <div>
                          <h2 className={cls.tableTitle}>{t("apportionment.remaining_residual_seats_assignment")}</h2>
                          <span className={cls.tableInformation}>
                            {t(
                              `apportionment.remaining_residual_seats_amount_and_information.${uniqueHighestAverageSteps.length + highestAverageSteps.length === 1 ? "singular" : "plural_unique"}`,
                              { num_seats: uniqueHighestAverageSteps.length + highestAverageSteps.length },
                            )}
                          </span>
                          {
                            <UniqueHighestAveragesTable
                              steps={uniqueHighestAverageSteps}
                              finalStanding={seatAssignment.final_standing}
                              politicalGroups={election.political_groups}
                            />
                          }
                          {highestAverageSteps.length > 0 && (
                            <>
                              <span className={cn(cls.tableInformation, "mt-lg")}>
                                {t(
                                  `apportionment.remaining_residual_seats_amount_and_information.${highestAverageSteps.length === 1 ? "singular" : "plural"}`,
                                  { num_seats: highestAverageSteps.length },
                                )}
                              </span>
                              {
                                <HighestAveragesTable
                                  steps={highestAverageSteps}
                                  finalStanding={seatAssignment.final_standing}
                                  politicalGroups={election.political_groups}
                                  resultChanges={[]}
                                />
                              }
                            </>
                          )}
                        </div>
                        {resultChanges.length > 0 && render_footnotes()}
                      </div>
                    )}
                  </>
                )}
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
