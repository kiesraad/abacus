import { t, tx } from "@/i18n/translate";
import type { AbsoluteMajorityDrawingLots } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatList } from "@/utils/strings";
import cls from "../Apportionment.module.css";

interface DrawingLotsForListProps {
  drawingLotsRequired:
    | (AbsoluteMajorityDrawingLots & {
        variant: "AbsoluteMajorityHighestAverage";
      })
    | (AbsoluteMajorityDrawingLots & {
        variant: "AbsoluteMajorityLargestRemainder";
      });
  options: number[];
  assign_to: number;
}

export function DrawingLotsForP9({ drawingLotsRequired, options, assign_to }: DrawingLotsForListProps) {
  return (
    <ul className={cn(cls.drawingLotsList, "w-32")}>
      <li>{t("apportionment.drawing_lots_for_p9.list_got_absolute_majority", { nr: assign_to })}</li>
      <li>
        {t("apportionment.drawing_lots_for_p9.last_residual_seat_to_list", {
          nr: assign_to,
        })}
      </li>
      <li>
        {tx("apportionment.drawing_lots_for_p9.lists_got_last_residual_seats", undefined, {
          lists: formatList(options, t("and")),
          variant:
            drawingLotsRequired.variant === "AbsoluteMajorityHighestAverage"
              ? t("apportionment.average_number")
              : t("apportionment.remainder_of"),
        })}
      </li>
      <li>{t("apportionment.drawing_lots_for_list.hence_drawing_lots_is_needed")}</li>
    </ul>
  );
}
