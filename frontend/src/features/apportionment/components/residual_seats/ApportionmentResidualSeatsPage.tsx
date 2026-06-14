import { type ReactElement, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
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
import {
  apportionmentCheckStateAndRedirect,
  getNotAssignedSeats,
  getNotAssignedSeatsText,
  renderNotAssignedSeatsAlert,
  renderTitleAndHeader,
} from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
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
  footNotes?: ReactElement;
  notAssignedSeats: number;
}

function LargeCouncilSection({
  seatAssignment,
  highestAverageSteps,
  politicalGroups,
  resultChanges,
  footNotes,
  notAssignedSeats,
}: LargeCouncilSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_highest_averages")}</h2>
        {renderInformation(seatAssignment.seats, seatAssignment.residual_seats)}
        <h3 className={cls.tableTitle}>{t("apportionment.averages_per_list")}:</h3>
        {notAssignedSeats > 0 && (
          <div className={cn(cls.notAssignedSeatsAlert, "mb-md-lg")}>
            {/* TODO: Update link to drawing lots page! */}
            {renderNotAssignedSeatsAlert(notAssignedSeats, ".", t("apportionment.go_to_drawing_lots"))}
          </div>
        )}
        {highestAverageSteps.length > 0 && (
          <HighestAveragesTable
            steps={highestAverageSteps}
            standings={seatAssignment.standings}
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
        {renderInformation(seatAssignment.seats, seatAssignment.residual_seats)}
        {largestRemainderSteps.length > 0 && (
          <LargestRemaindersTable
            steps={largestRemainderSteps}
            standings={seatAssignment.standings}
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
  largestRemainderSteps: LargestRemainderAssignmentStep[];
  uniqueHighestAverageSteps: UniqueHighestAverageAssignmentStep[];
  highestAverageSteps: HighestAverageAssignmentStep[];
  politicalGroups: PoliticalGroup[];
  footNotes?: ReactElement;
}

function HighestAveragesSection({
  seatAssignment,
  largestRemainderSteps,
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
        <UniqueHighestAveragesTable
          steps={uniqueHighestAverageSteps}
          largestRemainderSteps={largestRemainderSteps}
          standings={seatAssignment.standings}
          politicalGroups={politicalGroups}
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
              />
            }
          </>
        )}
      </div>
      {footNotes}
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
  footNotes?: ReactElement;
  notAssignedSeats: number;
}

function SmallCouncilSection({
  seatAssignment,
  largestRemainderSteps,
  uniqueHighestAverageSteps,
  highestAverageSteps,
  politicalGroups,
  resultChanges,
  footNotes,
  notAssignedSeats,
}: SmallCouncilSectionProps) {
  return (
    <>
      {notAssignedSeats > 0 && (
        <Alert type="notify">
          <strong className="heading-md">{getNotAssignedSeatsText(notAssignedSeats)}</strong>
          <Button.Link to=".">{t("apportionment.go_to_drawing_lots")}</Button.Link>
        </Alert>
      )}
      <LargestRemaindersSection
        seatAssignment={seatAssignment}
        largestRemainderSteps={largestRemainderSteps}
        politicalGroups={politicalGroups}
        resultChanges={resultChanges}
        footNotes={uniqueHighestAverageSteps.length === 0 && resultChanges.length > 0 ? footNotes : undefined}
      />
      {uniqueHighestAverageSteps.length > 0 && (
        <HighestAveragesSection
          seatAssignment={seatAssignment}
          largestRemainderSteps={largestRemainderSteps}
          uniqueHighestAverageSteps={uniqueHighestAverageSteps}
          highestAverageSteps={highestAverageSteps}
          politicalGroups={politicalGroups}
          footNotes={resultChanges.length > 0 ? footNotes : undefined}
        />
      )}
    </>
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO: Is there any way to make this shorter?
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
  if (seatAssignment) {
    const { largestRemainderSteps, uniqueHighestAverageSteps, highestAverageSteps, absoluteMajorityReassignment } =
      getAssignmentSteps(seatAssignment);
    const { residualSeatRemovalSteps, uniquePgNumbersWithFullSeatsRemoved } = getRemovalSteps(seatAssignment);

    const resultChanges = getResultChanges(
      uniquePgNumbersWithFullSeatsRemoved,
      absoluteMajorityReassignment,
      residualSeatRemovalSteps,
    );

    function renderFootnotes(): ReactElement {
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
        {renderTitleAndHeader(t("apportionment.allocation_of_residual_seats"))}
        <main>
          <article className={cls.article}>
            {seatAssignment.residual_seats > 0 ? (
              seatAssignment.seats >= LARGE_COUNCIL_THRESHOLD ? (
                <LargeCouncilSection
                  seatAssignment={seatAssignment}
                  highestAverageSteps={highestAverageSteps}
                  politicalGroups={election.political_groups}
                  resultChanges={resultChanges}
                  footNotes={resultChanges.length > 0 ? renderFootnotes() : undefined}
                  notAssignedSeats={getNotAssignedSeats(state)}
                />
              ) : (
                <SmallCouncilSection
                  seatAssignment={seatAssignment}
                  largestRemainderSteps={largestRemainderSteps}
                  uniqueHighestAverageSteps={uniqueHighestAverageSteps}
                  highestAverageSteps={highestAverageSteps}
                  politicalGroups={election.political_groups}
                  resultChanges={resultChanges}
                  footNotes={renderFootnotes()}
                  notAssignedSeats={getNotAssignedSeats(state)}
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
