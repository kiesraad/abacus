import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { type AnyApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import type {
  ApportionmentState,
  ApportionmentWarning,
  ChosenCandidate,
  ElectionSummary,
  ElectionWithPoliticalGroups,
  PreferenceThreshold,
  RESET_APPORTIONMENT_STATE_REQUEST_PATH,
  SeatAssignment,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { getNumberOfCandidates } from "@/utils/politicalGroups";
import { formatList } from "@/utils/strings";
import { useApportionmentContext } from "../hooks/useApportionmentContext";
import {
  apportionmentCheckStateAndRedirect,
  getNotAssignedSeats,
  renderNotAssignedSeatsAlert,
  renderTitleAndHeader,
} from "../utils/utils";
import cls from "./Apportionment.module.css";
import { ApportionmentError } from "./ApportionmentError";
import { ApportionmentTable } from "./ApportionmentTable";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";
import { type DeceasedCandidatesInfo, ElectionSummaryTable } from "./ElectionSummaryTable";

function getNumberOfSeatsAssignedSentence(seats: number, type: "residual_seat" | "full_seat"): string {
  return t(`apportionment.seats_assigned.${seats === 1 ? "singular" : "plural"}`, {
    num_seat: seats,
    type_seat: t(`apportionment.${type}.singular`).toLowerCase(),
  });
}

function renderApportionmentWarning(warning: ApportionmentWarning) {
  switch (warning) {
    case "AbsoluteMajorityAndListExhaustion":
      return (
        <Alert key={warning} type="warning" variant="no-icon">
          <p>{t("apportionment.warning.absolute_majority_and_list_exhaustion")}</p>
        </Alert>
      );
    case "NotAllSeatsAssigned":
      return (
        <Alert key={warning} type="warning" variant="no-icon">
          <p>{t("apportionment.warning.not_all_seats_assigned")}</p>
        </Alert>
      );
  }
}

function renderApportionmentWarnings(warnings: ApportionmentWarning[]) {
  if (warnings.length === 0) {
    return null;
  }
  return <FormLayout.Alert>{warnings.map(renderApportionmentWarning)}</FormLayout.Alert>;
}

function renderFinalisedAlert(
  warnings: ApportionmentWarning[],
  currentCommitteeSessionId: number,
  handleResetApportionmentState: () => void,
) {
  const notAllAssigned = warnings.some((w) => w === "NotAllSeatsAssigned");
  const hasWarnings = warnings.length > 0;
  return (
    <FormLayout.Alert>
      <Alert type={hasWarnings ? "notify" : "success"}>
        {!notAllAssigned && <strong className="heading-md">{t("apportionment.all_seats_assigned")}</strong>}
        <p>{t("apportionment.make_apportionment_definitive")}</p>
        <div className={cls.alertButtons}>
          <Button.Link size="md" to={`../report/committee-session/${currentCommitteeSessionId}/download`}>
            {t("election_management.to_report")}
          </Button.Link>
          <Button variant="secondary" size="md" onClick={handleResetApportionmentState}>
            {t("apportionment.redo_apportionment_button")}
          </Button>
        </div>
      </Alert>
    </FormLayout.Alert>
  );
}

function renderHighestAverageOrLargestRemainderDrawingLotsAlert(
  residualSeatNumbers: number[],
  variant: "HighestAverageResidualSeat" | "LargestRemainderResidualSeat",
) {
  return (
    <FormLayout.Alert>
      <Alert type="warning">
        <strong className="heading-md">
          {t("apportionment.drawing_lots_required_alert.title")}
          {residualSeatNumbers.length > 1 && "s"} {formatList(residualSeatNumbers, t("and"))}
        </strong>
        <p>
          {tx("apportionment.drawing_lots_required_alert.description", undefined, {
            variant:
              variant === "HighestAverageResidualSeat"
                ? t("apportionment.average_number")
                : t("apportionment.remainder_of"),
          })}
        </p>
        <ul>
          <li>
            {t(
              `apportionment.drawing_lots_required_alert.${variant === "HighestAverageResidualSeat" ? "same_averages" : "same_remainders"}`,
            )}
          </li>
          <li>{t("apportionment.drawing_lots_required_alert.drawing_lots_needed")}</li>
        </ul>
        <div className={cls.alertButtons}>
          {/* TODO: Update link to drawing lots page! */}
          <Button.Link size="md" to=".">
            {t("apportionment.to_drawing_lots")}
          </Button.Link>
          <Button.Link variant="secondary" size="md" to="./details-residual-seats">
            {t("apportionment.details_residual_seats_allocation")}
          </Button.Link>
        </div>
      </Alert>
    </FormLayout.Alert>
  );
}

function renderLinksToSeatAssignmentPages(seatAssignment: SeatAssignment) {
  return (
    <ul>
      <li>
        {getNumberOfSeatsAssignedSentence(seatAssignment.full_seats, "full_seat")} (
        <Link to="./details-full-seats">{t("apportionment.view_details").toLowerCase()}</Link>)
      </li>
      <li>
        {getNumberOfSeatsAssignedSentence(seatAssignment.residual_seats, "residual_seat")} (
        <Link to="./details-residual-seats">{t("apportionment.view_details").toLowerCase()}</Link>)
      </li>
    </ul>
  );
}

interface ElectionSummaryTableSectionProps {
  electionSummary: ElectionSummary;
  seatAssignment: SeatAssignment;
  election: ElectionWithPoliticalGroups;
  preferenceThreshold: PreferenceThreshold | undefined;
  numberOfDeceasedCandidates: number;
}

function ElectionSummaryTableSection({
  electionSummary,
  seatAssignment,
  election,
  preferenceThreshold,
  numberOfDeceasedCandidates,
}: ElectionSummaryTableSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.election_summary")}</h2>
        <ElectionSummaryTable
          votesCounts={electionSummary.votes_counts}
          seats={seatAssignment.seats}
          quota={seatAssignment.quota}
          numberOfVoters={electionSummary.number_of_voters}
          preferenceThreshold={preferenceThreshold}
          deceasedCandidatesInfo={
            {
              numberOfCandidates: getNumberOfCandidates(election.political_groups),
              numberOfDeceasedCandidates: numberOfDeceasedCandidates,
              deceasedCandidatesLink: `/elections/${election.id}/apportionment/deceased-candidates`,
            } satisfies DeceasedCandidatesInfo
          }
        />
      </div>
    </div>
  );
}

interface ApportionmentTableSectionProps {
  state: ApportionmentState;
  notAssignedSeats: number;
  seatAssignment: SeatAssignment;
  election: ElectionWithPoliticalGroups;
}

function ApportionmentTableSection({
  state,
  notAssignedSeats,
  seatAssignment,
  election,
}: ApportionmentTableSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>
          {state.type === "DrawingLots" ? t("apportionment.preliminary_result") : t("apportionment.title")}
        </h2>
        {notAssignedSeats > 0 && (
          <div className={cn(cls.notAssignedSeatsAlert, "mb-md-lg")}>
            {renderNotAssignedSeatsAlert(notAssignedSeats, "./details-residual-seats", t("apportionment.view_details"))}
          </div>
        )}
        <ApportionmentTable
          standings={seatAssignment.standings}
          politicalGroups={election.political_groups}
          fullSeats={seatAssignment.full_seats}
          residualSeats={seatAssignment.residual_seats}
          seats={seatAssignment.seats}
          notAssignedSeats={notAssignedSeats}
        />
        <div className={cls.footnoteDiv}>{renderLinksToSeatAssignmentPages(seatAssignment)}</div>
      </div>
    </div>
  );
}

function ChosenCandidatesTableSection({ chosenCandidates }: { chosenCandidates: ChosenCandidate[] }) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.chosen_candidates")}</h2>
        <span className={cls.tableInformation}>{t("apportionment.in_alphabetical_order")}</span>
        <ChosenCandidatesTable chosenCandidates={chosenCandidates} />
      </div>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO: Is there any way to make this shorter?
export function ApportionmentPage() {
  const navigate = useNavigate();
  const { currentCommitteeSession, election } = useElection();
  const { seatAssignment, candidateNomination, electionSummary, warnings, state, error, refetch } =
    useApportionmentContext();
  const [apiError, setApiError] = useState<AnyApiError>();
  const client = useApiClient();

  if (apiError) {
    throw apiError;
  }

  useEffect(() => {
    apportionmentCheckStateAndRedirect(state, election.id, navigate);
  });

  const renderTables =
    electionSummary && seatAssignment && (state?.type === "DrawingLots" || state?.type === "Finalised");
  const notAssignedSeats = getNotAssignedSeats(state);

  async function handleResetApportionmentState() {
    const path: RESET_APPORTIONMENT_STATE_REQUEST_PATH = `/api/elections/${election.id}/apportionment/reset`;
    const response: ApiResult<ApportionmentState> = await client.postRequest(path);

    if (isSuccess(response)) {
      await refetch();
    } else {
      setApiError(response);
    }
  }

  return (
    <>
      {renderTitleAndHeader(t("apportionment.title"))}
      <main>
        <article className={cls.article}>
          {error && error.reference === "ApportionmentCommitteeSessionNotCompleted" ? (
            <ApportionmentError error={error} />
          ) : (
            renderTables && (
              <>
                {renderApportionmentWarnings(warnings)}
                {state.type === "Finalised"
                  ? renderFinalisedAlert(
                      warnings,
                      currentCommitteeSession.id,
                      () => void handleResetApportionmentState(),
                    )
                  : state.drawing_lots_required.type === "ListDrawingLotsRequired" &&
                    state.drawing_lots_required.variant !== "AbsoluteMajorityHighestAverage" &&
                    state.drawing_lots_required.variant !== "AbsoluteMajorityLargestRemainder" &&
                    renderHighestAverageOrLargestRemainderDrawingLotsAlert(
                      state.drawing_lots_required.residual_seat_numbers,
                      state.drawing_lots_required.variant,
                    )}
                <ElectionSummaryTableSection
                  electionSummary={electionSummary}
                  seatAssignment={seatAssignment}
                  election={election}
                  preferenceThreshold={candidateNomination?.preference_threshold}
                  numberOfDeceasedCandidates={state.deceased_candidates.length}
                />
                <ApportionmentTableSection
                  state={state}
                  notAssignedSeats={notAssignedSeats}
                  seatAssignment={seatAssignment}
                  election={election}
                />
                {candidateNomination?.chosen_candidates && (
                  <ChosenCandidatesTableSection chosenCandidates={candidateNomination.chosen_candidates} />
                )}
              </>
            )
          )}
        </article>
      </main>
    </>
  );
}
