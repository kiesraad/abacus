import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PollingStation, usePollingStationList } from "@kiesraad/api";
import { IconError } from "@kiesraad/icon";
import { Alert, BottomBar, Button, Icon, KeyboardKeys, Spinner } from "@kiesraad/ui";
import { cn, parseIntStrict, useDebouncedCallback } from "@kiesraad/util";

import { PollingStationSelector } from "./PollingStationSelector";
import cls from "./PollingStationSelector.module.css";
import { PollingStationsList } from "./PollingStationsList";

const USER_INPUT_DEBOUNCE: number = 500; // ms

export function PollingStationChoiceForm() {
  const navigate = useNavigate();

  const { pollingStations, pollingStationsLoading } = usePollingStationList();
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPollingStation, setCurrentPollingStation] = useState<PollingStation | undefined>(
    undefined,
  );

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

  const handleSubmit = () => {
    if (pollingStationNumber === "") {
      setShowAlert(true);
      return;
    }

    const parsedStationNumber = parseIntStrict(pollingStationNumber);
    const pollingStation = pollingStations.find(
      (pollingStation) => pollingStation.number === parsedStationNumber,
    );

    if (pollingStation) {
      navigate(`./${pollingStation.id}/recounted`);
    } else {
      setShowAlert(true);
      setLoading(false);
      return;
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
        loading={loading}
        setLoading={setLoading}
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
        <div id="pollingStationSubmitFeedback" className={cn(cls.message, cls.submit, cls.error)}>
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
        <KeyboardKeys keys={["shift", "enter"]} />
      </BottomBar>
      <details>
        <summary>
          Weet je het nummer niet?
          <br />
          <span id="openPollingStationList" className="underlined pointer">
            Bekijk de lijst met alle stembureaus
          </span>
        </summary>
        <h2 className="form_title table_title">Kies het stembureau</h2>
        {(() => {
          if (pollingStationsLoading) {
            return (
              <div className="flex">
                <Icon icon={<Spinner size="lg" />} />
                aan het laden …
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
