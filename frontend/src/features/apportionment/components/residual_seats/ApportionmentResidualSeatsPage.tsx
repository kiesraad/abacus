import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import type { ApportionmentState, PoliticalGroup, SeatAssignment } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { buildAssignmentTableData } from "../../utils/seat-change";
import { apportionmentCheckStateAndRedirect, renderTitleAndHeader } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { DrawingLotsNotifyAlert } from "../DrawingLotsAlerts";
import { Footnotes } from "./Footnotes";
import { HighestAveragesTable } from "./HighestAveragesTable";
import { LargestRemaindersTable } from "./LargestRemaindersTable";
import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

export const LARGE_COUNCIL_THRESHOLD = 19;

interface ResidualSeatsInformationProps {
  residualSeats: number;
  system: "highest_averages" | "largest_remainders";
}

function ResidualSeatsInformation({ residualSeats, system }: ResidualSeatsInformationProps) {
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
      {tx(`apportionment.information_${system}`)}
    </span>
  );
}

interface CouncilSectionProps {
  seatAssignment: SeatAssignment;
  politicalGroups: PoliticalGroup[];
  state: ApportionmentState;
}

function SmallCouncilSection({ seatAssignment, politicalGroups, state }: CouncilSectionProps) {
  const tableData = buildAssignmentTableData(seatAssignment.steps, state);

  const largestRemainderSteps = tableData.LargestRemainderAssignment.steps;
  const uniqueHighestAverageSteps = tableData.UniqueHighestAverageAssignment.steps;
  const highestAverageSteps = tableData.HighestAverageAssignment.steps;

  return (
    <>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_remainders")}</h2>
        <ResidualSeatsInformation residualSeats={seatAssignment.residual_seats} system="largest_remainders" />
        {largestRemainderSteps.length > 0 && (
          <LargestRemaindersTable
            steps={largestRemainderSteps}
            standings={seatAssignment.standings}
            politicalGroups={politicalGroups}
            resultChanges={tableData.LargestRemainderAssignment.resultChanges}
          />
        )}
      </div>
      {uniqueHighestAverageSteps.length > 0 && (
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
            resultChanges={tableData.UniqueHighestAverageAssignment.resultChanges}
          />
          {highestAverageSteps.length > 0 && (
            <>
              <span className={cn(cls.tableInformation, "mt-lg")}>
                {t(
                  `apportionment.remaining_residual_seats_amount_and_information.${highestAverageSteps.length === 1 ? "singular" : "plural"}`,
                  { num_seats: highestAverageSteps.length },
                )}
              </span>
              <HighestAveragesTable
                steps={highestAverageSteps}
                standings={seatAssignment.standings}
                politicalGroups={politicalGroups}
                resultChanges={[]}
                state={state}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

function LargeCouncilSection({ seatAssignment, politicalGroups, state }: CouncilSectionProps) {
  const tableData = buildAssignmentTableData(seatAssignment.steps, state);

  const highestAverageSteps = tableData.HighestAverageAssignment.steps;

  return (
    <div>
      <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_highest_averages")}</h2>
      <ResidualSeatsInformation residualSeats={seatAssignment.residual_seats} system="highest_averages" />
      <h3 className={cls.tableTitle}>{t("apportionment.averages_per_list")}:</h3>
      {highestAverageSteps.length > 0 && (
        <HighestAveragesTable
          steps={highestAverageSteps}
          standings={seatAssignment.standings}
          politicalGroups={politicalGroups}
          resultChanges={tableData.HighestAverageAssignment.resultChanges}
          state={state}
        />
      )}
    </div>
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

  if (!seatAssignment || !state) {
    return null;
  }

  return (
    <>
      {renderTitleAndHeader(t("apportionment.allocation_of_residual_seats"))}
      <main>
        <article className={cls.article}>
          <DrawingLotsNotifyAlert state={state} />

          {seatAssignment.residual_seats > 0 ? (
            <div className={cn(cls.tableDiv, "mb-lg")}>
              {seatAssignment.seats >= LARGE_COUNCIL_THRESHOLD ? (
                <LargeCouncilSection
                  seatAssignment={seatAssignment}
                  politicalGroups={election.political_groups}
                  state={state}
                />
              ) : (
                <SmallCouncilSection
                  seatAssignment={seatAssignment}
                  politicalGroups={election.political_groups}
                  state={state}
                />
              )}
              <Footnotes seatAssignment={seatAssignment} state={state} />
            </div>
          ) : (
            <span>{t("apportionment.no_residual_seats_to_assign")}</span>
          )}
        </article>
      </main>
    </>
  );
}
