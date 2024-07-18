import { PollingStation, PollingStationsContext } from "@kiesraad/api";
import { Icon, InputField, Spinner } from "@kiesraad/ui";
import { useContext, useMemo, useState } from "react";
import cls from "./PollingStationSelector.module.css";
import { cn } from "@kiesraad/util";
import { IconError } from "@kiesraad/icon";

export function PollingStationSelector() {
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const { pollingStations, pollingStationsLoading } = useContext(PollingStationsContext);

  const currentPollingStation = useMemo(() => {
    const parsedInt = parseInt(pollingStationNumber, 10);
    if (pollingStationNumber !== "" && Number.isNaN(parsedInt)) {
      return undefined;
    }

    return pollingStations.find(
      (pollingStation: PollingStation) => pollingStation.number === parsedInt,
    );
  }, [pollingStationNumber, pollingStations]);

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
          if (pollingStationsLoading) {
            return (
              <div className={cls.result}>
                <Icon icon={<Spinner size="lg" />} />
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
                <Icon icon={<IconError />} color="error" />
                <span>Geen stembureau gevonden met nummer {pollingStationNumber}</span>
              </div>
            );
          }
        })()}
    </div>
  );
}
