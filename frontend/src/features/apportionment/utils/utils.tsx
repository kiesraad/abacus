import { Link, type NavigateFunction } from "react-router";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { t, tx } from "@/i18n/translate";
import type { ApportionmentState, SeatAssignment } from "@/types/generated/openapi";

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
  return tx(`apportionment.seats_left_to_assign.${notAssignedSeats === 1 ? "singular" : "plural"}`, undefined, {
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

export function getFinalStanding(seatAssignment: SeatAssignment) {
  return seatAssignment.final_standing.length > 0
    ? seatAssignment.final_standing
    : seatAssignment.steps.at(-1)?.standings;
}

export function getNotAssignedSeats(state: ApportionmentState | undefined) {
  return state?.type === "DrawingLots" &&
    state.drawing_lots_required.type === "ListDrawingLotsRequired" &&
    (state.drawing_lots_required.variant === "HighestAverageResidualSeat" ||
      state.drawing_lots_required.variant === "LargestRemainderResidualSeat")
    ? state.drawing_lots_required.residual_seat_numbers.length
    : 0;
}
