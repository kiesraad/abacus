import { t } from "@/i18n/translate";
import type { SeatAssignmentResult } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import type { AbsoluteMajorityReassignmentStep, ListExhaustionRemovalStep } from "../../utils/steps";
import cls from "../Apportionment.module.css";

interface FootnotesProps {
  uniquePgNumbersWithFullSeatsRemoved: number[];
  seatAssignment: SeatAssignmentResult | undefined;
  absoluteMajorityReassignment: AbsoluteMajorityReassignmentStep | undefined;
  residualSeatRemovalSteps: ListExhaustionRemovalStep[];
}

export function Footnotes({
  uniquePgNumbersWithFullSeatsRemoved,
  seatAssignment,
  absoluteMajorityReassignment,
  residualSeatRemovalSteps,
}: FootnotesProps) {
  return (
    <ol id="footnotes-list" className={cn(cls.footnotesList, "w-39")}>
      {uniquePgNumbersWithFullSeatsRemoved.map((pgNumber) => {
        return (
          <li key={pgNumber} id={`pg-${pgNumber}-full-seat-list-exhaustion-information`}>
            {t("apportionment.full_seat_removed_remainder_information", {
              num_full_seats: seatAssignment?.steps[0]?.standings[pgNumber - 1]?.full_seats || "",
            })}
          </li>
        );
      })}
      {absoluteMajorityReassignment && (
        <li id={`absolute-majority-reassignment-information`}>
          {t("apportionment.absolute_majority_reassignment", {
            pg_assigned_seat: absoluteMajorityReassignment.change.pg_assigned_seat,
            pg_retracted_seat: absoluteMajorityReassignment.change.pg_retracted_seat,
          })}
        </li>
      )}
      {residualSeatRemovalSteps.map((pgSeatRemoval, index) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
          <li key={index} id={`step-${index + 1}-residual-seat-list-exhaustion-information`}>
            {t("apportionment.list_exhaustion_residual_seat_removal", {
              pg_retracted_seat: pgSeatRemoval.change.pg_retracted_seat,
            })}
            {index === 0 && ` ${t("apportionment.article_p10")}`}
          </li>
        );
      })}
    </ol>
  );
}
