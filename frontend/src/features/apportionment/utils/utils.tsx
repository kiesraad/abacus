import type { NavigateFunction } from "react-router";
import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/i18n/translate";
import type {
  ApportionmentState,
  DrawingLotsRequired,
  ListDrawingLotsVariant,
  PoliticalGroup,
  SeatChangeStep,
} from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import {
  isAbsoluteMajorityReassignmentStep,
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

export interface SeatReassignedByDrawingLots {
  assigned_to: number;
  retracted_from: string;
}

export function getSeatReassignedByDrawingLotsStep(
  steps: SeatChangeStep[],
  politicalGroups: PoliticalGroup[],
): SeatReassignedByDrawingLots | undefined {
  for (const step of steps) {
    if (isAbsoluteMajorityReassignmentStep(step) && step.change.drawing_lots !== undefined) {
      return {
        assigned_to: step.change.list_assigned_seat,
        retracted_from: formatPoliticalGroupName(
          politicalGroups.find((pg) => pg.number === step.change.list_retracted_seat),
          true,
        ),
      };
    }
  }
  return undefined;
}

export interface ListCandidateDrawn {
  seat_number: number;
  candidate: string;
}

export function getListCandidatesDrawn(
  state: ApportionmentState,
  politicalGroup: PoliticalGroup,
): ListCandidateDrawn[] | undefined {
  if (state.type === "Finalised") {
    const listCandidatesDrawn: ListCandidateDrawn[] = [];
    for (const lot_drawn of state.candidates_drawn) {
      if (lot_drawn.variant.list === politicalGroup.number) {
        const seat_number = lot_drawn.variant.seat_numbers[0];
        const drawn_candidate = politicalGroup.candidates.find((candidate) => candidate.number === lot_drawn.drawn);
        if (seat_number && drawn_candidate) {
          listCandidatesDrawn.push({
            seat_number: seat_number,
            candidate: getCandidateFullName(drawn_candidate, true),
          });
        }
      }
    }
    return listCandidatesDrawn;
  }
  return undefined;
}

export interface AbsoluteMajorityReassignmentLists {
  seat_from_lists: number[];
  seat_to_list: number;
}

export function getAbsoluteMajorityReassignmentLists(
  state: ApportionmentState | undefined,
): AbsoluteMajorityReassignmentLists | undefined {
  return isListDrawingLotsVariant(state, ["AbsoluteMajorityLargestRemainder", "AbsoluteMajorityHighestAverage"])
    ? { seat_from_lists: state.drawing_lots_required.options, seat_to_list: state.drawing_lots_required.assign_to }
    : undefined;
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

export function isCandidateDrawingLots(state: ApportionmentState | undefined): state is Extract<
  ApportionmentState,
  { type: "DrawingLots" }
> & {
  drawing_lots_required: Extract<DrawingLotsRequired, { type: "CandidateDrawingLotsRequired" }>;
} {
  return state?.type === "DrawingLots" && state.drawing_lots_required.type === "CandidateDrawingLotsRequired";
}

export function getNotAssignedSeats(state: ApportionmentState | undefined) {
  return isListDrawingLotsVariant(state, ["HighestAverageResidualSeat", "LargestRemainderResidualSeat"])
    ? state.drawing_lots_required.residual_seat_numbers.length
    : 0;
}
