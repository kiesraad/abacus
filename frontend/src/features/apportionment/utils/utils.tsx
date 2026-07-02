import { Link, type NavigateFunction } from "react-router";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";
import type {
  ApportionmentState,
  DrawingLotsRequired,
  ListDrawingLotsVariant,
  PoliticalGroup,
  SeatChangeStep,
} from "@/types/generated/openapi";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import cls from "../components/Apportionment.module.css";
import {
  isHighestAverageAssignmentStep,
  isLargestRemainderAssignmentStep,
  isUniqueHighestAverageAssignmentStep,
} from "./steps";

export function renderTitleAndHeader(sectionTitle: string) {
  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{sectionTitle}</h1>
        </section>
      </header>
    </>
  );
}

export function getNotAssignedSeatsText(notAssignedSeats: number) {
  return t(`apportionment.seats_left_to_assign.${notAssignedSeats === 1 ? "singular" : "plural"}`, {
    num_seat: notAssignedSeats,
  });
}

export function renderNotAssignedSeatsAlert(notAssignedSeats: number) {
  return (
    <div className={cls.notAssignedSeatsAlert}>
      <Alert type="notify">
        <strong className="heading-md">{getNotAssignedSeatsText(notAssignedSeats)}</strong>
        <Button.Link to="../drawing-lots">{t("apportionment.go_to_drawing_lots")}</Button.Link>
      </Alert>
    </div>
  );
}

export function renderSeatNeedsToBeRetractedAlert(alertText: string, linkTo: string, linkText: string) {
  return (
    <Alert type="notify" small>
      <p>
        {alertText} <Link to={linkTo}>{linkText}</Link>
      </p>
    </Alert>
  );
}

export interface ListAssignedByDrawingLots {
  residual_seat_number: number;
  name: string;
}

export function getAssignedByDrawingLotsStep(
  step: SeatChangeStep,
  politicalGroups: PoliticalGroup[],
): ListAssignedByDrawingLots | undefined {
  if (
    (isHighestAverageAssignmentStep(step) ||
      isUniqueHighestAverageAssignmentStep(step) ||
      isLargestRemainderAssignmentStep(step)) &&
    step.change.drawing_lots !== undefined &&
    step.residual_seat_number
  ) {
    return {
      residual_seat_number: step.residual_seat_number,
      name: formatPoliticalGroupName(
        politicalGroups.find((pg) => pg.number === step.change.selected_list_number),
        true,
      ),
    };
  }
  return undefined;
}

export function apportionmentCheckStateAndRedirect(
  state: ApportionmentState | undefined,
  electionId: number,
  navigate: NavigateFunction,
) {
  if (state?.type === "Uninitialised") {
    void navigate(`/elections/${electionId}/apportionment/include-all-candidates`);
  } else if (state?.type === "RegisteringDeceasedCandidates") {
    void navigate(`/elections/${electionId}/apportionment/deceased-candidates`);
  }
}

export function isListDrawingLotsVariant<TVariant extends ListDrawingLotsVariant["variant"]>(
  state: ApportionmentState | undefined,
  variants: TVariant[],
): state is Extract<ApportionmentState, { type: "DrawingLots" }> & {
  drawing_lots_required: Extract<DrawingLotsRequired, { variant: TVariant }>;
} {
  if (state?.type !== "DrawingLots" || state.drawing_lots_required.type !== "ListDrawingLotsRequired") {
    return false;
  }
  const { variant } = state.drawing_lots_required;
  return variants.some((v) => v === variant);
}

export function getNotAssignedSeats(state: ApportionmentState | undefined) {
  return isListDrawingLotsVariant(state, ["HighestAverageResidualSeat", "LargestRemainderResidualSeat"])
    ? state.drawing_lots_required.residual_seat_numbers.length
    : 0;
}

export function getSeatNeedsToBeRetracted(state: ApportionmentState | undefined) {
  return (
    state?.type === "DrawingLots" &&
    state.drawing_lots_required.type === "ListDrawingLotsRequired" &&
    (state.drawing_lots_required.variant === "AbsoluteMajorityLargestRemainder" ||
      state.drawing_lots_required.variant === "AbsoluteMajorityHighestAverage")
  );
}

export function getAbsoluteMajorityReassignmentLists(state: ApportionmentState | undefined) {
  return state?.type === "DrawingLots" &&
    state.drawing_lots_required.type === "ListDrawingLotsRequired" &&
    (state.drawing_lots_required.variant === "AbsoluteMajorityLargestRemainder" ||
      state.drawing_lots_required.variant === "AbsoluteMajorityHighestAverage")
    ? { seat_from_lists: state.drawing_lots_required.options, seat_to_list: state.drawing_lots_required.assign_to }
    : { seat_from_lists: [], seat_to_list: undefined };
}
