import { useContext, useMemo, useState } from "react";

import { PollingStation, PollingStationsContext } from "@kiesraad/api";
import { IconError } from "@kiesraad/icon";
import { Icon, InputField, Spinner } from "@kiesraad/ui";
import { cn, useDebouncedCallback } from "@kiesraad/util";

import cls from "./PollingStationSelector.module.css";

export function PollingStationSelector() {
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPollingStation, setCurrentPollingStation] = useState<PollingStation | undefined>(
    undefined,
  );

  const { pollingStations, pollingStationsLoading } = useContext(PollingStationsContext);

  const debouncedCallback = useDebouncedCallback((pollingStation: PollingStation | undefined) => {
    setLoading(false);
    setCurrentPollingStation(pollingStation);
  }, 200);

  useMemo(() => {
    const parsedInt = parseInt(pollingStationNumber, 10);
    if (pollingStationNumber !== "" && Number.isNaN(parsedInt)) {
      return undefined;
    }

    setLoading(true);
    debouncedCallback(
      pollingStations.find((pollingStation: PollingStation) => pollingStation.number === parsedInt),
    );
  }, [pollingStationNumber, pollingStations, debouncedCallback]);

  return (
    <div className={cls.container}>
      <InputField
        id="pollingStation"
        name="number"
        value={pollingStationNumber}
        label="Voer het nummer in:"
        fieldWidth="narrow"
        margin={false}
        maxLength={6}
        onChange={(e) => {
          setPollingStationNumber(e.target.value);
        }}
      />
      {pollingStationNumber.trim() !== "" &&
        (() => {
          if (pollingStationsLoading || loading) {
            return (
              <div className={cls.result}>
                <span className={cls.icon}>
                  <Icon icon={<Spinner size="md" />} />
                </span>
                <span>aan het zoeken …</span>
              </div>
            );
          } else if (currentPollingStation) {
            return (
              <div id="pollingStationSelectorFeedback" className={cn(cls.result, cls.success)}>
                <span className={"bold"}>{currentPollingStation.name}</span>
                {/* TODO: <Badge type="first_entry" />*/}
              </div>
            );
          } else {
            return (
              <div id="pollingStationSelectorFeedback" className={cn(cls.result, cls.error)}>
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
