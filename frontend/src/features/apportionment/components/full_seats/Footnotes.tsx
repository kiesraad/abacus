import type { ReactElement } from "react";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";
import type { ListExhaustionRemovalStep } from "../../utils/steps";
import cls from "../Apportionment.module.css";

interface FootnotesProps {
  fullSeatRemovalSteps: ListExhaustionRemovalStep[];
}

export function Footnotes({ fullSeatRemovalSteps }: FootnotesProps): ReactElement {
  return (
    <ol id="footnotes-list" className={cn(cls.footnotesList, "w-39")}>
      {fullSeatRemovalSteps.map((listSeatRemoval, index) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
          <li key={index} id={`step-${index + 1}-list-exhaustion-information`}>
            {t("apportionment.list_exhaustion_full_seat_removal", {
              list_retracted_seat: listSeatRemoval.change.list_retracted_seat,
            })}
            {index === 0 && ` ${t("apportionment.article_p10")}`}
          </li>
        );
      })}
    </ol>
  );
}
