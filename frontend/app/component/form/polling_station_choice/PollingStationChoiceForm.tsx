import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PollingStationsContext } from "@kiesraad/api";
import { BottomBar, Button, Icon, Spinner } from "@kiesraad/ui";

import { PollingStationSelector } from "./PollingStationSelector";
import { PollingStationsList } from "./PollingStationsList";

export function PollingStationChoiceForm() {
  const navigate = useNavigate();

  const { pollingStations, pollingStationsLoading } = useContext(PollingStationsContext);
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");

  const handleSubmit = () => {
    const parsedStationNumber = parseInt(pollingStationNumber, 10);
    if (pollingStations.some((ps) => ps.number === parsedStationNumber)) {
      navigate(`./${pollingStationNumber}/recounted`);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        return;
      }}
    >
      <h2 className="form_title">Welk stembureau ga je invoeren?</h2>
      <PollingStationSelector
        pollingStationNumber={pollingStationNumber}
        setPollingStationNumber={setPollingStationNumber}
        handleSubmit={handleSubmit}
      />
      <p className="md">
        Klopt de naam van het stembureau met de naam op je papieren proces verbaal?
        <br />
        Dan kan je beginnen.
      </p>
      <BottomBar type="form">
        <Button
          type="button"
          size="lg"
          onClick={() => {
            handleSubmit();
          }}
        >
          Beginnen
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
      <details>
        <summary>
          <p>
            Weet je het nummer niet?
            <br />
            <span id="openPollingStationList" className="underlined pointer">
              Bekijk de lijst met alle stembureaus
            </span>
          </p>
        </summary>
        <h2 className="form_title table_title">Kies het stembureau</h2>
        {pollingStationsLoading ? (
          <div className="flex">
            <Icon icon={<Spinner size="lg" />} />
            aan het zoeken …
          </div>
        ) : (
          <PollingStationsList pollingStations={pollingStations} />
        )}
      </details>
    </form>
  );
}
