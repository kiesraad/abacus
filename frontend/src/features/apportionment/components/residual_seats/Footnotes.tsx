import { t } from "@/i18n/translate";
import type { ApportionmentState, SeatAssignment } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatList } from "@/utils/strings";
import { getRemovalSteps, isAbsoluteMajorityReassignmentStep } from "../../utils/steps";
import { isListDrawingLotsVariant } from "../../utils/utils";
import cls from "../Apportionment.module.css";

interface FootnotesProps {
  seatAssignment: SeatAssignment;
  state: ApportionmentState;
}

export function Footnotes({ seatAssignment, state }: FootnotesProps) {
  const { residualSeatRemovalSteps, listsWithFullSeatsRemoved } = getRemovalSteps(seatAssignment);
  const absoluteMajorityStep = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
  const absoluteMajorityDrawingLots = isListDrawingLotsVariant(state, [
    "AbsoluteMajorityHighestAverage",
    "AbsoluteMajorityLargestRemainder",
  ]);

  if (
    listsWithFullSeatsRemoved.length === 0 &&
    !absoluteMajorityDrawingLots &&
    !absoluteMajorityStep &&
    residualSeatRemovalSteps.length === 0
  ) {
    return null;
  }

  // Uses the same order as buildAssignmentTableData in seat-change.tsx
  return (
    <ol id="footnotes-list" className={cn(cls.footnotesList, "w-39")}>
      {listsWithFullSeatsRemoved.map((listNumber) => {
        return (
          <li key={listNumber} id={`list-${listNumber}-full-seat-list-exhaustion-information`}>
            {t("apportionment.footnotes.full_seat_removed_remainder_information", {
              num_full_seats: seatAssignment.steps[0]?.standings[listNumber - 1]?.full_seats || "",
            })}
          </li>
        );
      })}
      {absoluteMajorityDrawingLots && (
        <li id={`absolute-majority-reassignment-drawing-lots-information`}>
          {t("apportionment.footnotes.absolute_majority_reassignment.text", {
            list_assigned_seat: state.drawing_lots_required.assign_to,
          })}{" "}
          {t("apportionment.footnotes.absolute_majority_reassignment.drawing_lots", {
            options: formatList(state.drawing_lots_required.options, t("or")),
          })}
        </li>
      )}
      {absoluteMajorityStep && (
        <li id={`absolute-majority-reassignment-information`}>
          {t("apportionment.footnotes.absolute_majority_reassignment.text", {
            list_assigned_seat: absoluteMajorityStep.change.list_assigned_seat,
          })}{" "}
          {t("apportionment.footnotes.absolute_majority_reassignment.result", {
            list_retracted_seat: absoluteMajorityStep.change.list_retracted_seat,
          })}
          {absoluteMajorityStep.change.drawing_lots &&
            t("apportionment.footnotes.absolute_majority_reassignment.options", {
              options: formatList(absoluteMajorityStep.change.drawing_lots.options, t("and")),
            })}
          .
        </li>
      )}
      {residualSeatRemovalSteps.map((listSeatRemoval, index) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
          <li key={index} id={`step-${index + 1}-residual-seat-list-exhaustion-information`}>
            {t("apportionment.footnotes.list_exhaustion_residual_seat_removal", {
              list_retracted_seat: listSeatRemoval.change.list_retracted_seat,
            })}
            {index === 0 && ` ${t("apportionment.footnotes.article_p10")}`}
          </li>
        );
      })}
    </ol>
  );
}
