import { Link, type NavigateFunction } from "react-router";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { t, tx } from "@/i18n/translate";
import type {
  ApportionmentState,
  DrawingLotsRequired,
  ListDrawingLotsVariant,
  PoliticalGroup,
  SeatChangeStep,
} from "@/types/generated/openapi";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
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

export function renderNotAssignedSeatsAlert(notAssignedSeats: number, linkTo: string, linkText: string) {
  return (
    <Alert type="notify" small>
      <p>
        {getNotAssignedSeatsText(notAssignedSeats)} <Link to={linkTo}>{linkText}</Link>
      </p>
    </Alert>
  );
}

export function getAssignedByDrawingLotsStepAlertText(step: SeatChangeStep, politicalGroups: PoliticalGroup[]) {
  if (
    (isHighestAverageAssignmentStep(step) ||
      isUniqueHighestAverageAssignmentStep(step) ||
      isLargestRemainderAssignmentStep(step)) &&
    step.change.drawing_lots !== undefined &&
    step.residual_seat_number
  ) {
    return tx("apportionment.assigned_by_drawing_lots_alert", undefined, {
      nr: step.residual_seat_number,
      list: formatPoliticalGroupName(
        politicalGroups.find((pg) => pg.number === step.change.selected_list_number),
        true,
      ),
    });
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
