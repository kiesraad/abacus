import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import type { ApportionmentState } from "@/types/generated/openapi";
import { getNotAssignedSeats, getNotAssignedSeatsText, isListDrawingLotsVariant } from "../utils/utils";
import cls from "./Apportionment.module.css";

export interface DrawingLotsWarningAlertProps {
  withoutResidualSeatsLink?: boolean;
  children: ReactNode;
}

export function DrawingLotsWarningAlert({ withoutResidualSeatsLink = false, children }: DrawingLotsWarningAlertProps) {
  return (
    <FormLayout.Alert>
      <Alert type="warning">
        {children}
        <div className={cls.alertButtons}>
          <Button.Link size="md" to="./drawing-lots">
            {t("apportionment.to_drawing_lots")}
          </Button.Link>
          {!withoutResidualSeatsLink && (
            <Button.Link variant="secondary" size="md" to="./details-residual-seats">
              {t("apportionment.details_residual_seats_allocation")}
            </Button.Link>
          )}
        </div>
      </Alert>
    </FormLayout.Alert>
  );
}

export interface DrawingLotsNotifyAlertProps {
  state: ApportionmentState;
}

export function DrawingLotsNotifyAlert({ state }: DrawingLotsNotifyAlertProps) {
  const notAssignedSeats = getNotAssignedSeats(state);
  const seatNeedsToBeRetracted = isListDrawingLotsVariant(state, [
    "AbsoluteMajorityLargestRemainder",
    "AbsoluteMajorityHighestAverage",
  ]);
  return (
    (notAssignedSeats > 0 || seatNeedsToBeRetracted) && (
      <div className={cls.drawingLotsAlert}>
        <Alert type="notify">
          <strong className="heading-md">
            {notAssignedSeats > 0
              ? getNotAssignedSeatsText(notAssignedSeats)
              : t("apportionment.seat_needs_to_be_retracted")}
          </strong>
          <Button.Link to="../drawing-lots">{t("apportionment.go_to_drawing_lots")}</Button.Link>
        </Alert>
      </div>
    )
  );
}
