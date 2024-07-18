import { PollingStation, PollingStationsContext } from "@kiesraad/api";
import { Icon, InputField, Spinner } from "@kiesraad/ui";
import { useContext, useMemo, useState } from "react";
import cls from "./PollingStationSelector.module.css";
import { cn } from "@kiesraad/util";
import { IconError } from "@kiesraad/icon";

const ERROR_MESSAGE: string = "Alleen positieve nummers toegestaan";

export function PollingStationSelector() {
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { pollingStations, pollingStationsLoading } = useContext(PollingStationsContext);

  const currentPollingStation = useMemo(() => {
    const parsedInt = parseInt(pollingStationNumber, 10);
    if (pollingStationNumber !== "" && Number.isNaN(parsedInt)) {
      setError(ERROR_MESSAGE);
      return undefined;
    }

    setError("");
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
        pattern="\d+"
        title={ERROR_MESSAGE}
        maxLength={6}
        onChange={(e) => {
          setPollingStationNumber(e.target.value);
        }}
      />
      {pollingStationNumber.trim() !== "" &&
        (() => {
          if (error) {
            return (
              <div className={cn(cls.result, cls.error)}>
                <Icon icon={<IconError />} color="error" />
                <span>{error}</span>
              </div>
            );
          } else if (pollingStationsLoading) {
            return (
              <div className={cls.result}>
                <Icon icon={<Spinner size="lg" />} />
                <span>aan het zoeken …</span>
              </div>
            );
          } else if (currentPollingStation) {
            return (
              <div className={cn(cls.result, cls.success)}>
                <span className={"bold"}>{currentPollingStation.name}</span>
                {/* TODO: <Badge type="first_entry" />*/}
              </div>
            );
          } else {
            return (
              <div className={cn(cls.result, cls.error)}>
                <Icon icon={<IconError />} color="error" />
                <span>Geen stembureau gevonden met nummer {pollingStationNumber}</span>
              </div>
            );
          }
        })()}
    </div>
  );
}
