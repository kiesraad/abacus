import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PollingStation, usePollingStationList } from "@kiesraad/api";
import { IconError } from "@kiesraad/icon";
import { Alert, BottomBar, Button, Icon, Spinner } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import { PollingStationSelector } from "./PollingStationSelector";
import cls from "./PollingStationSelector.module.css";
import { PollingStationsList } from "./PollingStationsList";

export function PollingStationChoiceForm() {
  const navigate = useNavigate();

  const { pollingStations, pollingStationsLoading } = usePollingStationList();
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [currentPollingStation, setCurrentPollingStation] = useState<PollingStation | undefined>(
    undefined,
  );

  const handleSubmit = () => {
    if (!currentPollingStation || pollingStationNumber === "") {
      setShowAlert(true);
      return;
    }

    const parsedStationNumber = parseInt(pollingStationNumber, 10);
    const pollingStation = pollingStations.find(
      (pollingStation) => pollingStation.number === parsedStationNumber,
    );
    if (pollingStation) {
      navigate(`./${pollingStation.id}/recounted`);
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
        currentPollingStation={currentPollingStation}
        setCurrentPollingStation={setCurrentPollingStation}
        setShowAlert={setShowAlert}
        handleSubmit={handleSubmit}
      />
      <p className="md">
        Klopt de naam van het stembureau met de naam op je papieren proces verbaal?
        <br />
        Dan kan je beginnen. Klopt de naam niet? Overleg met de coördinator.
      </p>
      {showAlert && (
        <div
          id="pollingStationSubmitFeedback"
          className={cn(cls.message, cls.error, cls.border, cls.errorcolor)}
        >
          <span className={cls.icon}>
            <Icon icon={<IconError />} color="error" />
          </span>
          <span>Voer een geldig nummer van een stembureau in om te beginnen</span>
        </div>
      )}
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
        {(() => {
          if (pollingStationsLoading) {
            return (
              <div className="flex">
                <Icon icon={<Spinner size="lg" />} />
                aan het zoeken …
              </div>
            );
          } else if (pollingStations.length === 0) {
            return <Alert type={"error"}>Geen stembureaus gevonden</Alert>;
          } else {
            return <PollingStationsList pollingStations={pollingStations} />;
          }
        })()}
      </details>
    </form>
  );
}
