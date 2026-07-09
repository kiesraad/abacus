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
  PoliticalGroup,
  PreferenceThreshold,
  RESET_APPORTIONMENT_STATE_REQUEST_PATH,
  SeatAssignment,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { getNumberOfCandidates } from "@/utils/politicalGroups";
import { formatList } from "@/utils/strings";
import { formatPoliticalGroupName } from "../../../utils/politicalGroup";
import { useApportionmentContext } from "../hooks/useApportionmentContext";
import {
  type AbsoluteMajorityReassignmentLists,
  apportionmentCheckStateAndRedirect,
  getAbsoluteMajorityReassignmentLists,
  getAssignedByDrawingLotsStep,
  getNotAssignedSeats,
  getNotAssignedSeatsText,
  getSeatReassignedByDrawingLotsStep,
  isCandidateDrawingLots,
  isListDrawingLotsVariant,
  type ListAssignedByDrawingLots,
  renderTitleAndHeader,
  type SeatReassignedByDrawingLots,
} from "../utils/utils";
import cls from "./Apportionment.module.css";
import { ApportionmentError } from "./ApportionmentError";
import { ApportionmentTable } from "./ApportionmentTable";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";
import { DrawingLotsWarningAlert } from "./DrawingLotsAlerts";
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
    <DrawingLotsWarningAlert>
      <strong className="heading-md">
        {t(
          `apportionment.drawing_lots_required_for_list_alert.title.${residualSeatNumbers.length === 1 ? "singular" : "plural"}`,
        )}{" "}
        {formatList(residualSeatNumbers, t("and"))}
      </strong>
      <p>
        {t("apportionment.drawing_lots_required_for_list_alert.description", {
          variant:
            variant === "HighestAverageResidualSeat"
              ? t("apportionment.average_number")
              : t("apportionment.remainder_of"),
        })}
      </p>
      <ul>
        <li>
          {t(
            `apportionment.drawing_lots_required_for_list_alert.${variant === "HighestAverageResidualSeat" ? "same_averages" : "same_remainders"}`,
          )}
        </li>
        <li>{t("apportionment.drawing_lots_required_for_list_alert.drawing_lots_needed")}</li>
      </ul>
    </DrawingLotsWarningAlert>
  );
}

function renderAbsoluteMajorityDrawingLotsAlert(
  options: number[],
  assign_to: string,
  variant: "AbsoluteMajorityHighestAverage" | "AbsoluteMajorityLargestRemainder",
) {
  const variantString =
    variant === "AbsoluteMajorityHighestAverage" ? t("apportionment.average_number") : t("apportionment.remainder_of");
  return (
    <DrawingLotsWarningAlert>
      <strong className="heading-md">{t("apportionment.drawing_lots_required_for_p9_alert.title")}</strong>
      <p>{t("apportionment.drawing_lots_required_for_p9_alert.description", { name: assign_to })}</p>
      <p>
        {t("apportionment.drawing_lots_required_for_p9_alert.article_p9", { variant: variantString })}{" "}
        {tx("apportionment.drawing_lots_required_for_p9_alert.last_residual_seat", undefined, {
          lists: formatList(options, t("and")),
          variant: variantString,
        })}{" "}
        {t("apportionment.drawing_lots_required_for_p9_alert.drawing_lots_needed")}
      </p>
    </DrawingLotsWarningAlert>
  );
}

function renderCandidatesDrawingLotsAlert(options: number[], list: string, num_seats: number) {
  return (
    <DrawingLotsWarningAlert withoutResidualSeatsLink>
      <strong className="heading-md">{t("apportionment.drawing_lots_required_for_candidates_alert.title")}</strong>
      <p>
        {t(
          `apportionment.drawing_lots_required_for_candidates_alert.description.${num_seats === 1 ? "singular" : "plural"}`,
          {
            num_candidates: options.length,
            list: list,
            num_seats: num_seats,
          },
        )}
      </p>
      <ul>
        <li>
          {t(
            `apportionment.drawing_lots_required_for_candidates_alert.drawing_lots_needed.${num_seats === 1 ? "singular" : "plural"}`,
          )}
        </li>
      </ul>
    </DrawingLotsWarningAlert>
  );
}

function renderDrawingLotsAlert(state: ApportionmentState, politicalGroups: PoliticalGroup[]) {
  return isListDrawingLotsVariant(state, ["HighestAverageResidualSeat", "LargestRemainderResidualSeat"])
    ? renderHighestAverageOrLargestRemainderDrawingLotsAlert(
        state.drawing_lots_required.residual_seat_numbers,
        state.drawing_lots_required.variant,
      )
    : isListDrawingLotsVariant(state, ["AbsoluteMajorityLargestRemainder", "AbsoluteMajorityHighestAverage"])
      ? renderAbsoluteMajorityDrawingLotsAlert(
          state.drawing_lots_required.options,
          formatPoliticalGroupName(politicalGroups.find((pg) => pg.number === state.drawing_lots_required.assign_to)) ||
            "",
          state.drawing_lots_required.variant,
        )
      : isCandidateDrawingLots(state) &&
        renderCandidatesDrawingLotsAlert(
          state.drawing_lots_required.options,
          formatPoliticalGroupName(politicalGroups.find((pg) => pg.number === state.drawing_lots_required.list)) || "",
          state.drawing_lots_required.seat_numbers.length,
        );
}

function renderNotifyDrawingLotsAlert(
  listsAssignedByDrawingLots: ListAssignedByDrawingLots[],
  seatReassignedByDrawingLots: SeatReassignedByDrawingLots | undefined,
  notAssignedSeats: number,
  absoluteMajorityReassignmentLists: AbsoluteMajorityReassignmentLists | undefined,
) {
  return (
    <div className={cn(cls.smallAlert, "mb-md-lg")}>
      <Alert type="notify" small>
        {listsAssignedByDrawingLots.length === 1 ? (
          <p>
            {listsAssignedByDrawingLots.map((list, index) => (
              <span key={`drawing-lots-assignment-${index + 1}`}>
                {tx("apportionment.assigned_by_drawing_lots_alert.singular", undefined, {
                  nr: list.residual_seat_number,
                  list: list.name,
                })}
              </span>
            ))}
          </p>
        ) : (
          listsAssignedByDrawingLots.length > 1 && (
            <>
              <p>{t("apportionment.assigned_by_drawing_lots_alert.plural.title")}</p>
              <ul>
                {listsAssignedByDrawingLots.map((list, index) => (
                  <li key={`drawing-lots-assignment-${index + 1}`}>
                    {tx("apportionment.assigned_by_drawing_lots_alert.plural.assigned_to", undefined, {
                      nr: list.residual_seat_number,
                      list: list.name,
                    })}
                  </li>
                ))}
              </ul>
            </>
          )
        )}
        {seatReassignedByDrawingLots !== undefined && (
          <p>
            {tx("apportionment.reassigned_by_drawing_lots_alert", undefined, {
              assigned_to: seatReassignedByDrawingLots.assigned_to,
              retracted_from: seatReassignedByDrawingLots.retracted_from,
            })}
          </p>
        )}
        {notAssignedSeats > 0 && (
          <p>
            {getNotAssignedSeatsText(notAssignedSeats)}{" "}
            <Link to="./details-residual-seats">{t("apportionment.view_details")}</Link>
          </p>
        )}
        {absoluteMajorityReassignmentLists !== undefined && (
          <p>
            {t("apportionment.lists_a_seat_needs_to_be_reassigned_for", {
              seat_from_lists: formatList(absoluteMajorityReassignmentLists.seat_from_lists, t("or")),
              seat_to_list: absoluteMajorityReassignmentLists.seat_to_list,
            })}{" "}
            <Link to="./drawing-lots">{t("apportionment.go_to_drawing_lots")}</Link>
          </p>
        )}
      </Alert>
    </div>
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
  seatAssignment: SeatAssignment;
  election: ElectionWithPoliticalGroups;
}

function ApportionmentTableSection({ state, seatAssignment, election }: ApportionmentTableSectionProps) {
  const notAssignedSeats = getNotAssignedSeats(state);
  const absoluteMajorityReassignmentLists = getAbsoluteMajorityReassignmentLists(state);
  const listsAssignedByDrawingLots: ListAssignedByDrawingLots[] = [];
  seatAssignment.steps.forEach((step) => {
    const listAssignedByDrawingLots = getAssignedByDrawingLotsStep(step, election.political_groups);
    if (listAssignedByDrawingLots !== undefined) {
      listsAssignedByDrawingLots.push(listAssignedByDrawingLots);
    }
  });
  const seatReassignedByDrawingLots = getSeatReassignedByDrawingLotsStep(
    seatAssignment.steps,
    election.political_groups,
  );
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>
          {state.type === "DrawingLots" ? t("apportionment.preliminary_result") : t("apportionment.title")}
        </h2>
        {(notAssignedSeats > 0 ||
          absoluteMajorityReassignmentLists !== undefined ||
          listsAssignedByDrawingLots.length > 0 ||
          seatReassignedByDrawingLots !== undefined) &&
          renderNotifyDrawingLotsAlert(
            listsAssignedByDrawingLots,
            seatReassignedByDrawingLots,
            notAssignedSeats,
            absoluteMajorityReassignmentLists,
          )}
        <ApportionmentTable
          standings={seatAssignment.standings}
          politicalGroups={election.political_groups}
          fullSeats={seatAssignment.full_seats}
          residualSeats={seatAssignment.residual_seats}
          seats={seatAssignment.seats}
          notAssignedSeats={notAssignedSeats}
          withoutLinks={state.type === "DrawingLots"}
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
          {error ? (
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
                  : renderDrawingLotsAlert(state, election.political_groups)}
                <ElectionSummaryTableSection
                  electionSummary={electionSummary}
                  seatAssignment={seatAssignment}
                  election={election}
                  preferenceThreshold={candidateNomination?.preference_threshold}
                  numberOfDeceasedCandidates={state.deceased_candidates.length}
                />
                <ApportionmentTableSection state={state} seatAssignment={seatAssignment} election={election} />
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
