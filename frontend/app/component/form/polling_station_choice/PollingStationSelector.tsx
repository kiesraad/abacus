import { PollingStation, PollingStationsContext } from "@kiesraad/api";
import { InputField } from "@kiesraad/ui";
import { useContext, useMemo, useState } from "react";

export function PollingStationSelector() {
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const { pollingStations, pollingStationsLoading } = useContext(PollingStationsContext);

  const currentPollingStation = useMemo(() => {
    const parsedInt = parseInt(pollingStationNumber, 10);
    if (Number.isNaN(parsedInt)) {
      return undefined;
    }

    return pollingStations.find(
      (pollingStation: PollingStation) => pollingStation.number === parsedInt,
    );
  }, [pollingStationNumber, pollingStations]);

  return (
    <div>
      <InputField
        id="pollingStation"
        name="number"
        value={pollingStationNumber}
        label="Voer het nummer in:"
        fieldWidth="narrow"
        margin={false}
        pattern="\d+"
        title="Alleen positieve nummers toegestaan"
        maxLength={6}
        onChange={(e) => {
          setPollingStationNumber(e.target.value);
        }}
      />
      {(() => {
        if (pollingStationNumber.trim() === "") {
          return null;
        } else if (pollingStationsLoading) {
          return <div>aan het zoeken …</div>;
        } else if (currentPollingStation) {
          return <div>{currentPollingStation.name}</div>;
        } else {
          return <div>Geen stembureau gevonden met nummer {pollingStationNumber}</div>;
        }
      })()}
    </div>
  );
}
