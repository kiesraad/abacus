import { Dispatch, SetStateAction, useMemo, useState } from "react";

import { PollingStation, usePollingStationList } from "@kiesraad/api";
import { IconError } from "@kiesraad/icon";
import { Icon, InputField, Spinner } from "@kiesraad/ui";
import { cn, parseIntStrict, useDebouncedCallback } from "@kiesraad/util";

import cls from "./PollingStationSelector.module.css";

export interface PollingStationSelectorProps {
  pollingStationNumber: string;
  setPollingStationNumber: Dispatch<SetStateAction<string>>;
  currentPollingStation: PollingStation | undefined;
  setCurrentPollingStation: Dispatch<SetStateAction<PollingStation | undefined>>;
  setShowAlert: Dispatch<SetStateAction<boolean>>;
  handleSubmit: () => void;
}

const USER_INPUT_DEBOUNCE: number = 500; // ms

export function PollingStationSelector({
  pollingStationNumber,
  setPollingStationNumber,
  currentPollingStation,
  setCurrentPollingStation,
  setShowAlert,
  handleSubmit,
}: PollingStationSelectorProps) {
  const [loading, setLoading] = useState<boolean>(false);

  const { pollingStations, pollingStationsLoading } = usePollingStationList();

  const debouncedCallback = useDebouncedCallback((pollingStation: PollingStation | undefined) => {
    setLoading(false);
    setCurrentPollingStation(pollingStation);
  }, USER_INPUT_DEBOUNCE);

  useMemo(() => {
    const parsedInt = parseIntStrict(pollingStationNumber);
    setLoading(true);
    debouncedCallback(
      pollingStations.find((pollingStation: PollingStation) => pollingStation.number === parsedInt),
    );
  }, [pollingStationNumber, pollingStations, debouncedCallback]);

  return (
    <div className={cls.container}>
      <InputField
        id="pollingStation"
        className={cls.input}
        name="number"
        value={pollingStationNumber}
        label="Voer het nummer in:"
        fieldWidth="narrow"
        margin={false}
        maxLength={6}
        onChange={(e) => {
          setShowAlert(false);
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
          if (pollingStationsLoading || loading) {
            return (
              <div className={cls.message}>
                <span className={cls.icon}>
                  <Icon icon={<Spinner size="md" />} />
                </span>
                <span>aan het zoeken …</span>
              </div>
            );
          } else if (currentPollingStation) {
            return (
              <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.success)}>
                <span className="bold">{currentPollingStation.name}</span>
                {/* TODO: <Badge type="first_entry" />*/}
              </div>
            );
          } else {
            return (
              <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls.error)}>
                <span className={cls.icon}>
                  <Icon icon={<IconError />} color="error" />
                </span>
                <span>Geen stembureau gevonden met nummer {pollingStationNumber}</span>
              </div>
            );
          }
        })()}
    </div>
  );
}
