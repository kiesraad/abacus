import { t } from "@/i18n/translate";
import type { Candidate, CandidateDrawingLotsVariant } from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import { cn } from "@/utils/classnames";
import cls from "../Apportionment.module.css";

interface DrawingLotsForCandidateProps {
  drawingLotsRequired: CandidateDrawingLotsVariant;
  options: Candidate[];
  list: string;
}

export function DrawingLotsForCandidate({ drawingLotsRequired, options, list }: DrawingLotsForCandidateProps) {
  const seatNumber = drawingLotsRequired.seat_numbers[0];
  if (seatNumber) {
    return (
      <ul className={cn(cls.drawingLotsList, "w-32")} aria-label="drawing-lots-information">
        <li>
          {t(
            `apportionment.drawing_lots_for_candidate.total_seats.${drawingLotsRequired.total_seats === 1 ? "singular" : "plural"}`,
            {
              list: list,
              total_seats: drawingLotsRequired.total_seats,
            },
          )}
        </li>
        <li>
          {t("apportionment.drawing_lots_for_candidate.candidates_for_drawing_lots", {
            num_candidates: options.length,
            seat_number: seatNumber,
            votes: drawingLotsRequired.number_of_votes,
          })}
          <ul aria-label="drawing-lots-options">
            {options.map((option) => (
              <li key={option.number}>{`${option.number}. ${getCandidateFullName(option, true)}`}</li>
            ))}
          </ul>
        </li>
        <li>
          {t("apportionment.drawing_lots_for_candidate.hence_drawing_lots_is_needed", { seat_number: seatNumber })}
        </li>
      </ul>
    );
  }
}
