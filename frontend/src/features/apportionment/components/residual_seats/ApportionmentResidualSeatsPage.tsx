import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import type { ApportionmentState, PoliticalGroup, SeatAssignment } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { getResultChanges, type ResultChange, splitResultChanges } from "../../utils/seat-change";
import {
  getAssignmentSteps,
  getRemovalSteps,
  type HighestAverageAssignmentStep,
  type LargestRemainderAssignmentStep,
  type UniqueHighestAverageAssignmentStep,
} from "../../utils/steps";
import { apportionmentCheckStateAndRedirect, isListDrawingLotsVariant, renderTitleAndHeader } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { DrawingLotsNotifyAlert } from "../DrawingLotsAlerts";
import { Footnotes } from "./Footnotes";
import { HighestAveragesTable } from "./HighestAveragesTable";
import { LargestRemaindersTable } from "./LargestRemaindersTable";
import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

export const LARGE_COUNCIL_THRESHOLD = 19;

function renderInformation(seats: number, residualSeats: number) {
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
  state: ApportionmentState;
}

function LargeCouncilSection({
  seatAssignment,
  highestAverageSteps,
  politicalGroups,
  resultChanges,
  state,
}: LargeCouncilSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_highest_averages")}</h2>
        {renderInformation(seatAssignment.seats, seatAssignment.residual_seats)}
        <h3 className={cls.tableTitle}>{t("apportionment.averages_per_list")}:</h3>
        {highestAverageSteps.length > 0 && (
          <HighestAveragesTable
            steps={highestAverageSteps}
            standings={seatAssignment.standings}
            politicalGroups={politicalGroups}
            resultChanges={resultChanges}
            state={state}
          />
        )}
      </div>
      {(isP9DrawingLots(state) || resultChanges.length > 0) && (
        <Footnotes seatAssignment={seatAssignment} state={state} />
      )}
    </div>
  );
}

interface LargestRemaindersSectionProps {
  seatAssignment: SeatAssignment;
  largestRemainderSteps: LargestRemainderAssignmentStep[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
  state: ApportionmentState;
}

function LargestRemaindersSection({
  seatAssignment,
  largestRemainderSteps,
  politicalGroups,
  resultChanges,
  state,
}: LargestRemaindersSectionProps) {
  const { uniqueHighestAverageSteps } = getAssignmentSteps(seatAssignment);
  const { largestRemainderResultChanges } = splitResultChanges(resultChanges, largestRemainderSteps);

  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_remainders")}</h2>
        {renderInformation(seatAssignment.seats, seatAssignment.residual_seats)}
        {largestRemainderSteps.length > 0 && (
          <LargestRemaindersTable
            steps={largestRemainderSteps}
            standings={seatAssignment.standings}
            politicalGroups={politicalGroups}
            resultChanges={largestRemainderResultChanges}
          />
        )}
      </div>
      {uniqueHighestAverageSteps.length === 0 && (isP9DrawingLots(state) || resultChanges.length > 0) && (
        <Footnotes seatAssignment={seatAssignment} state={state} />
      )}
    </div>
  );
}

interface HighestAveragesSectionProps {
  seatAssignment: SeatAssignment;
  largestRemainderSteps: LargestRemainderAssignmentStep[];
  uniqueHighestAverageSteps: UniqueHighestAverageAssignmentStep[];
  highestAverageSteps: HighestAverageAssignmentStep[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
  state: ApportionmentState;
}

function HighestAveragesSection({
  seatAssignment,
  largestRemainderSteps,
  uniqueHighestAverageSteps,
  highestAverageSteps,
  politicalGroups,
  resultChanges,
  state,
}: HighestAveragesSectionProps) {
  const { uniqueHighestAverageResultChanges } = splitResultChanges(resultChanges, largestRemainderSteps);

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
        <UniqueHighestAveragesTable
          steps={uniqueHighestAverageSteps}
          largestRemainderSteps={largestRemainderSteps}
          standings={seatAssignment.standings}
          politicalGroups={politicalGroups}
          resultChanges={uniqueHighestAverageResultChanges}
        />
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
                standings={seatAssignment.standings}
                politicalGroups={politicalGroups}
                resultChanges={[]}
                state={state}
              />
            }
          </>
        )}
      </div>
      {(isP9DrawingLots(state) || resultChanges.length > 0) && (
        <Footnotes seatAssignment={seatAssignment} state={state} />
      )}
    </div>
  );
}

interface SmallCouncilSectionProps {
  seatAssignment: SeatAssignment;
  largestRemainderSteps: LargestRemainderAssignmentStep[];
  uniqueHighestAverageSteps: UniqueHighestAverageAssignmentStep[];
  highestAverageSteps: HighestAverageAssignmentStep[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
  state: ApportionmentState;
}

function SmallCouncilSection({
  seatAssignment,
  largestRemainderSteps,
  uniqueHighestAverageSteps,
  highestAverageSteps,
  politicalGroups,
  resultChanges,
  state,
}: SmallCouncilSectionProps) {
  return (
    <>
      <LargestRemaindersSection
        seatAssignment={seatAssignment}
        largestRemainderSteps={largestRemainderSteps}
        politicalGroups={politicalGroups}
        resultChanges={resultChanges}
        state={state}
      />
      {uniqueHighestAverageSteps.length > 0 && (
        <HighestAveragesSection
          seatAssignment={seatAssignment}
          largestRemainderSteps={largestRemainderSteps}
          uniqueHighestAverageSteps={uniqueHighestAverageSteps}
          highestAverageSteps={highestAverageSteps}
          politicalGroups={politicalGroups}
          resultChanges={resultChanges}
          state={state}
        />
      )}
    </>
  );
}

function isP9DrawingLots(state: ApportionmentState) {
  return (
    isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage", "AbsoluteMajorityLargestRemainder"]) || false
  );
}

export function ApportionmentResidualSeatsPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { seatAssignment, error, state } = useApportionmentContext();

  useEffect(() => {
    apportionmentCheckStateAndRedirect(state, election.id, navigate);
  });

  if (error) {
    return <ApportionmentErrorPage sectionTitle={t("apportionment.allocation_of_residual_seats")} error={error} />;
  }
  if (seatAssignment && state) {
    const { largestRemainderSteps, uniqueHighestAverageSteps, highestAverageSteps, P9Step } =
      getAssignmentSteps(seatAssignment);
    const { residualSeatRemovalSteps, listsWithFullSeatsRemoved } = getRemovalSteps(seatAssignment);
    const resultChanges = getResultChanges(listsWithFullSeatsRemoved, state, P9Step, residualSeatRemovalSteps);

    return (
      <>
        {renderTitleAndHeader(t("apportionment.allocation_of_residual_seats"))}
        <main>
          <article className={cls.article}>
            <DrawingLotsNotifyAlert state={state} />
            {seatAssignment.residual_seats > 0 ? (
              seatAssignment.seats >= LARGE_COUNCIL_THRESHOLD ? (
                <LargeCouncilSection
                  seatAssignment={seatAssignment}
                  highestAverageSteps={highestAverageSteps}
                  politicalGroups={election.political_groups}
                  resultChanges={resultChanges}
                  state={state}
                />
              ) : (
                <SmallCouncilSection
                  seatAssignment={seatAssignment}
                  largestRemainderSteps={largestRemainderSteps}
                  uniqueHighestAverageSteps={uniqueHighestAverageSteps}
                  highestAverageSteps={highestAverageSteps}
                  politicalGroups={election.political_groups}
                  resultChanges={resultChanges}
                  state={state}
                />
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
