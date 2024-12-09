import { Dispatch, SetStateAction } from "react";

import { PollingStation } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconError, IconWarning } from "@kiesraad/icon";
import { Badge, Icon, InputField, Spinner } from "@kiesraad/ui";
import { cn, removeLeadingZeros, usePollingStationStatus } from "@kiesraad/util";

import cls from "./PollingStationSelector.module.css";

export interface PollingStationSelectorProps {
  pollingStationNumber: string;
  setPollingStationNumber: Dispatch<SetStateAction<string>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  currentPollingStation: PollingStation | undefined;
  setCurrentPollingStation: Dispatch<SetStateAction<PollingStation | undefined>>;
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
  const currentPollingStationStatus = usePollingStationStatus(currentPollingStation?.id);

  return (
    <div className={cls.container}>
      <InputField
        id="pollingStation"
        className={cls.input}
        name="number"
        value={pollingStationNumber}
        label={t("polling_station_choice.insert_number")}
        fieldWidth="narrow"
        margin={false}
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
            if (currentPollingStationStatus === "definitive") {
              return (
                <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.warning)}>
                  <span className={cls.icon}>
                    <Icon icon={<IconWarning aria-label={t("contains_warning")} />} color="warning" />
                  </span>
                  {t("polling_station.title.singular")} {currentPollingStation.number}
                  <span className="bold">({currentPollingStation.name})</span>
                  {t("polling_station_choice.has_already_been_filled_twice")}
                </div>
              );
            } else {
              return (
                <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.success)}>
                  <span className="bold">{currentPollingStation.name}</span>
                  {currentPollingStationStatus && <Badge type={currentPollingStationStatus} showIcon />}
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
