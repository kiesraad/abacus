import { PollingStation, usePollingStationListRequest } from "@kiesraad/api";
import { InputField } from "@kiesraad/ui";
import { useMemo, useState } from "react";

export function PollingStationSelector() {
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const pollingStations = usePollingStationListRequest({
    //election_id: parseInt(id || ""),
    election_id: 1, // TODO
  });

  const currentPollingStation = useMemo(() => {
    const parsedInt = parseInt(pollingStationNumber, 10);
    if (Number.isNaN(parsedInt)) {
      return undefined;
    }
    
    return pollingStations.data?.polling_stations
      .find((pollingStation: PollingStation) => pollingStation.number === parsedInt);
    
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
        onChange={(e) => setPollingStationNumber(e.target.value)}
      />
      {(() => {
        if (pollingStationNumber === "") {
          return null;
        } else if (pollingStations.loading) {
          return (
            <div>
              aan het zoeken …
            </div>
          );
        } else if (currentPollingStation) {
          return (
            <div>
              {currentPollingStation.name}
            </div>
          )
        } else if (currentPollingStation === undefined) {
          return (
            <div>
              Geen stembureau gevonden met nummer {pollingStationNumber}
            </div>
          );
        }
      })()}
    </div>
  );
}
