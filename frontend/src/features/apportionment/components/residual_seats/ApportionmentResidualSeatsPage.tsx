import type { ReactElement } from "react";
import { Link } from "react-router";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import type { PoliticalGroup, SeatAssignment } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { getResultChanges, type ResultChange } from "../../utils/seat-change";
import {
  getAssignmentSteps,
  getRemovalSteps,
  type HighestAverageAssignmentStep,
  type LargestRemainderAssignmentStep,
  type UniqueHighestAverageAssignmentStep,
} from "../../utils/steps";
import { render_title_and_header } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { Footnotes } from "./Footnotes";
import { HighestAveragesTable } from "./HighestAveragesTable";
import { LargestRemaindersTable } from "./LargestRemaindersTable";
import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

export const LARGE_COUNCIL_THRESHOLD = 19;

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
      {tx(`apportionment.information_${seats >= LARGE_COUNCIL_THRESHOLD ? "highest_averages" : "largest_remainders"}`)}
    </span>
  );
}

interface LargeCouncilSectionProps {
  seatAssignment: SeatAssignment;
  highestAverageSteps: HighestAverageAssignmentStep[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
  footNotes?: ReactElement;
}

function LargeCouncilSection({
  seatAssignment,
  highestAverageSteps,
  politicalGroups,
  resultChanges,
  footNotes,
}: LargeCouncilSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_highest_averages")}</h2>
        {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
        {highestAverageSteps.length > 0 && (
          <HighestAveragesTable
            steps={highestAverageSteps}
            finalStanding={seatAssignment.final_standing}
            politicalGroups={politicalGroups}
            resultChanges={resultChanges}
          />
        )}
      </div>
      {footNotes}
    </div>
  );
}

interface LargestRemaindersSectionProps {
  seatAssignment: SeatAssignment;
  largestRemainderSteps: LargestRemainderAssignmentStep[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
  footNotes?: ReactElement;
}

function LargestRemaindersSection({
  seatAssignment,
  largestRemainderSteps,
  politicalGroups,
  resultChanges,
  footNotes,
}: LargestRemaindersSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_remainders")}</h2>
        {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
        {largestRemainderSteps.length > 0 && (
          <LargestRemaindersTable
            steps={largestRemainderSteps}
            finalStanding={seatAssignment.final_standing}
            politicalGroups={politicalGroups}
            resultChanges={resultChanges}
          />
        )}
      </div>
      {footNotes}
    </div>
  );
}

interface HighestAveragesSectionProps {
  seatAssignment: SeatAssignment;
  uniqueHighestAverageSteps: UniqueHighestAverageAssignmentStep[];
  highestAverageSteps: HighestAverageAssignmentStep[];
  politicalGroups: PoliticalGroup[];
  footNotes?: ReactElement;
}

function HighestAveragesSection({
  seatAssignment,
  uniqueHighestAverageSteps,
  highestAverageSteps,
  politicalGroups,
  footNotes,
}: HighestAveragesSectionProps) {
  return (
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
            politicalGroups={politicalGroups}
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
                politicalGroups={politicalGroups}
                resultChanges={[]}
              />
            }
          </>
        )}
      </div>
      {footNotes}
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO function should be refactored
export function ApportionmentResidualSeatsPage() {
  const { election } = useElection();
  const { seatAssignment, error } = useApportionmentContext();

  if (error) {
    return <ApportionmentErrorPage sectionTitle={t("apportionment.details_residual_seats")} error={error} />;
  }
  if (seatAssignment) {
    const [largestRemainderSteps, uniqueHighestAverageSteps, highestAverageSteps, absoluteMajorityReassignment] =
      getAssignmentSteps(seatAssignment);
    const [, residualSeatRemovalSteps, uniquePgNumbersWithFullSeatsRemoved] = getRemovalSteps(seatAssignment);

    const resultChanges = getResultChanges(
      uniquePgNumbersWithFullSeatsRemoved,
      absoluteMajorityReassignment,
      residualSeatRemovalSteps,
    );

    function render_footnotes(): ReactElement {
      return (
        <Footnotes
          uniquePgNumbersWithFullSeatsRemoved={uniquePgNumbersWithFullSeatsRemoved}
          seatAssignment={seatAssignment}
          absoluteMajorityReassignment={absoluteMajorityReassignment}
          residualSeatRemovalSteps={residualSeatRemovalSteps}
        />
      );
    }

    return (
      <>
        {render_title_and_header(t("apportionment.details_residual_seats"))}
        <main>
          <article className={cls.article}>
            {seatAssignment.residual_seats > 0 ? (
              seatAssignment.seats >= LARGE_COUNCIL_THRESHOLD ? (
                <LargeCouncilSection
                  seatAssignment={seatAssignment}
                  highestAverageSteps={highestAverageSteps}
                  politicalGroups={election.political_groups}
                  resultChanges={resultChanges}
                  footNotes={resultChanges.length > 0 ? render_footnotes() : undefined}
                />
              ) : (
                <>
                  <LargestRemaindersSection
                    seatAssignment={seatAssignment}
                    largestRemainderSteps={largestRemainderSteps}
                    politicalGroups={election.political_groups}
                    resultChanges={resultChanges}
                    footNotes={
                      uniqueHighestAverageSteps.length === 0 && resultChanges.length > 0
                        ? render_footnotes()
                        : undefined
                    }
                  />
                  {uniqueHighestAverageSteps.length > 0 && (
                    <HighestAveragesSection
                      seatAssignment={seatAssignment}
                      uniqueHighestAverageSteps={uniqueHighestAverageSteps}
                      highestAverageSteps={highestAverageSteps}
                      politicalGroups={election.political_groups}
                      footNotes={resultChanges.length > 0 ? render_footnotes() : undefined}
                    />
                  )}
                </>
              )
            ) : (
              <span>{t("apportionment.no_residual_seats_to_assign")}</span>
            )}
          </article>
        </main>
      </>
    );
  }
}
