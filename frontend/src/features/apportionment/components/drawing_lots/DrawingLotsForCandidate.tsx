import { t } from "@/i18n/translate";
import type { Candidate, CandidateDrawingLotsVariant } from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import { cn } from "@/utils/classnames";
import cls from "../Apportionment.module.css";

interface DrawingLotsForCandidateProps {
  drawingLotsRequired: CandidateDrawingLotsVariant;
  options: Candidate[];
}

export function DrawingLotsForCandidate({ drawingLotsRequired, options }: DrawingLotsForCandidateProps) {
  //const total_seats = drawingLotsRequired.seat_numbers.at(-1);
  return (
    <ul className={cn(cls.drawingLotsList, "w-32")}>
      {/* TODO: Add list name instead of list number and add total seats */}
      <li>{t("apportionment.drawing_lots_for_candidate.total_seats", { list: drawingLotsRequired.list })}</li>
      {/* TODO: Add assigned_seats and make conditional based on assigned_seats to singular/plural */}
      <li>{t("apportionment.drawing_lots_for_candidate.seats_assigned_already.singular")}</li>
      {/* TODO: Add formatted list with seats and add votes */}
      <li>
        {t("apportionment.drawing_lots_for_candidate.candidates_for_drawing_lots", { num_candidates: options.length })}
        <ul>
          {options.map((option) => (
            <li key={option.number}>{`${option.number}. ${getCandidateFullName(option, true)}`}</li>
          ))}
        </ul>
      </li>
      <li>{t("apportionment.drawing_lots_for_candidate.hence_drawing_lots_is_needed")}</li>
    </ul>
  );
}
