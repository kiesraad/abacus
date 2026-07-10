import type { ReactElement } from "react";
import { t } from "@/i18n/translate";
import type { SeatAssignment } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatList } from "@/utils/strings";
import type { AbsoluteMajorityReassignmentStep, ListExhaustionRemovalStep } from "../../utils/steps";
import cls from "../Apportionment.module.css";

interface FootnotesProps {
  listsWithFullSeatsRemoved: number[];
  seatAssignment: SeatAssignment | undefined;
  absoluteMajorityStep: AbsoluteMajorityReassignmentStep | undefined;
  residualSeatRemovalSteps: ListExhaustionRemovalStep[];
}

export function Footnotes({
  listsWithFullSeatsRemoved,
  seatAssignment,
  absoluteMajorityStep,
  residualSeatRemovalSteps,
}: FootnotesProps): ReactElement {
  return (
    <ol id="footnotes-list" className={cn(cls.footnotesList, "w-39")}>
      {listsWithFullSeatsRemoved.map((listNumber) => {
        return (
          <li key={listNumber} id={`list-${listNumber}-full-seat-list-exhaustion-information`}>
            {t("apportionment.full_seat_removed_remainder_information", {
              num_full_seats: seatAssignment?.steps[0]?.standings[listNumber - 1]?.full_seats || "",
            })}
          </li>
        );
      })}
      {absoluteMajorityStep && (
        <li id={`absolute-majority-reassignment-information`}>
          {t("apportionment.absolute_majority_reassignment", {
            list_assigned_seat: absoluteMajorityStep.change.list_assigned_seat,
          })}{" "}
          {t("apportionment.absolute_majority_reassignment_result", {
            list_retracted_seat: absoluteMajorityStep.change.list_retracted_seat,
          })}
          {absoluteMajorityStep.change.drawing_lots &&
            t("apportionment.absolute_majority_reassignment_options", {
              options: formatList(absoluteMajorityStep.change.drawing_lots.options, t("and")),
            })}
          .
        </li>
      )}
      {residualSeatRemovalSteps.map((listSeatRemoval, index) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
          <li key={index} id={`step-${index + 1}-residual-seat-list-exhaustion-information`}>
            {t("apportionment.list_exhaustion_residual_seat_removal", {
              list_retracted_seat: listSeatRemoval.change.list_retracted_seat,
            })}
            {index === 0 && ` ${t("apportionment.article_p10")}`}
          </li>
        );
      })}
    </ol>
  );
}
