import { t, tx } from "@/i18n/translate";
import type {
  HighestAverageResidualSeatDrawingLots,
  LargestRemainderResidualSeatDrawingLots,
  PoliticalGroup,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { getFractionInteger, getFractionWithoutInteger } from "@/utils/fraction";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { formatList } from "@/utils/strings";
import cls from "../Apportionment.module.css";

interface DrawingLotsForListProps {
  drawingLotsRequired:
    | (HighestAverageResidualSeatDrawingLots & {
        variant: "HighestAverageResidualSeat";
      })
    | (LargestRemainderResidualSeatDrawingLots & {
        variant: "LargestRemainderResidualSeat";
      });
  options: PoliticalGroup[];
}

export function DrawingLotsForList({ drawingLotsRequired, options }: DrawingLotsForListProps) {
  const total_residual_seats = drawingLotsRequired.residual_seat_numbers.at(-1);
  const current_residual_seat = drawingLotsRequired.residual_seat_numbers[0];
  const variant =
    drawingLotsRequired.variant === "HighestAverageResidualSeat" ? "highest_average" : "largest_remainder";
  const max_value =
    drawingLotsRequired.variant === "HighestAverageResidualSeat"
      ? drawingLotsRequired.max_average
      : drawingLotsRequired.max_remainder;
  if (total_residual_seats && current_residual_seat) {
    return (
      <ul className={cn(cls.drawingLotsList, "w-32")}>
        <li>
          {t(
            `apportionment.drawing_lots_for_list.residual_seats_to_assign.${total_residual_seats === 1 ? "singular" : "plural"}`,
            { nr: total_residual_seats },
          )}
        </li>
        <li>
          {t("apportionment.drawing_lots_for_list.seat_cannot_be_assigned_automatically", {
            nr: current_residual_seat,
          })}
        </li>
        <li>{t(`apportionment.drawing_lots_for_list.list_gets_the_seat_with.${variant}`)}</li>
        <li>
          {/* TODO: How to make sure the comma and "and" are not <strong>? */}
          {tx(`apportionment.drawing_lots_for_list.draw_lots_for_lists_with_same.${variant}`, undefined, {
            lists: formatList(
              options.map((pg) => formatPoliticalGroupName(pg)),
              t("and"),
            ),
            value: `${getFractionInteger(max_value)} ${max_value.numerator > 0 ? getFractionWithoutInteger(max_value) : ""}`,
          })}
        </li>
        <li>{t("apportionment.drawing_lots_for_list.hence_drawing_lots_is_needed")}</li>
      </ul>
    );
  }
}
