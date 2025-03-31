import { Dispatch, SetStateAction } from "react";

import { t, tx } from "@kiesraad/i18n";
import { IconError, IconWarning } from "@kiesraad/icon";
import { Badge, Icon, InputField, Spinner } from "@kiesraad/ui";
import { cn, removeLeadingZeros } from "@kiesraad/util";

import cls from "./PollingStationSelector.module.css";
import { PollingStationUserStatus, PollingStationWithStatus } from "./util";

export interface PollingStationSelectorProps {
  pollingStationNumber: string;
  setPollingStationNumber: Dispatch<SetStateAction<string>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  currentPollingStation: PollingStationWithStatus | undefined;
  setAlert: Dispatch<SetStateAction<string | undefined>>;
  handleSubmit: () => void;
}

export function PollingStationSelector({
  pollingStationNumber,
  setPollingStationNumber,
  loading,
  currentPollingStation,
  setAlert,
  handleSubmit,
}: PollingStationSelectorProps) {
  return (
    <div className={cls.container}>
      <InputField
        id="pollingStation"
        className={cn(cls.input, "font-number")}
        name="number"
        value={pollingStationNumber}
        label={t("polling_station_choice.insert_number")}
        fieldWidth="narrow"
        maxLength={6}
        autoFocus={true}
        onChange={(e) => {
          setAlert(undefined);
          setPollingStationNumber(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.shiftKey && e.key === "Enter") {
            handleSubmit();
          }
        }}
      />

      {pollingStationNumber.trim() !== "" &&
        (() => {
          if (loading) {
            return (
              <div id="pollingStationSelectorFeedback" className={cls.message}>
                <span className={cls.icon}>
                  <Icon icon={<Spinner size="md" />} />
                </span>
                <span>{t("polling_station_choice.searching")} &hellip;</span>
              </div>
            );
          } else if (currentPollingStation) {
            switch (currentPollingStation.userStatus) {
              case PollingStationUserStatus.FINISHED:
                return (
                  <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.warning)}>
                    <span className={cls.icon}>
                      <Icon icon={<IconWarning aria-label={t("contains_warning")} />} color="warning" />
                    </span>
                    <span>
                      {tx("polling_station_choice.has_already_been_filled_twice", undefined, {
                        nr: currentPollingStation.number,
                        name: currentPollingStation.name,
                      })}
                    </span>
                  </div>
                );
              case PollingStationUserStatus.IN_PROGRESS_OTHER_USER:
                return (
                  <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.warning)}>
                    <span className={cls.icon}>
                      <Icon icon={<IconWarning aria-label={t("contains_warning")} />} color="warning" />
                    </span>
                    <span>
                      {tx("polling_station_choice.assigned_to_different_user", undefined, {
                        nr: currentPollingStation.number,
                      })}
                    </span>
                  </div>
                );
              default:
                return (
                  <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.success)}>
                    <span className="bold">{currentPollingStation.name}</span>
                    {currentPollingStation.statusEntry && (
                      <Badge type={currentPollingStation.statusEntry.status} showIcon />
                    )}
                  </div>
                );
            }
          } else {
            return (
              <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.error)}>
                <span className={cls.icon}>
                  <Icon icon={<IconError aria-label={t("contains_error")} />} color="error" />
                </span>
                <span>
                  {t("polling_station_choice.no_polling_station_found_with_number", {
                    nr: removeLeadingZeros(pollingStationNumber),
                  })}
                </span>
              </div>
            );
          }
        })()}
    </div>
  );
}
