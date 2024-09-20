import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PollingStation, useElection } from "@kiesraad/api";
import { IconError } from "@kiesraad/icon";
import { Alert, BottomBar, Button, Icon, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";
import { cn, parsePollingStationNumber, useDebouncedCallback } from "@kiesraad/util";

import { PollingStationSelector } from "./PollingStationSelector";
import cls from "./PollingStationSelector.module.css";
import { PollingStationsList } from "./PollingStationsList";

const USER_INPUT_DEBOUNCE: number = 500; // ms

export interface PollingStationChoiceFormProps {
  anotherEntry?: boolean;
}

export function PollingStationChoiceForm({ anotherEntry }: PollingStationChoiceFormProps) {
  const navigate = useNavigate();

  const { pollingStations } = useElection();
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPollingStation, setCurrentPollingStation] = useState<PollingStation | undefined>(undefined);

  const debouncedCallback = useDebouncedCallback((pollingStation: PollingStation | undefined) => {
    setLoading(false);
    setCurrentPollingStation(pollingStation);
  }, USER_INPUT_DEBOUNCE);

  useMemo(() => {
    const parsedInt = parsePollingStationNumber(pollingStationNumber);
    setLoading(true);
    debouncedCallback(pollingStations.find((pollingStation: PollingStation) => pollingStation.number === parsedInt));
  }, [pollingStationNumber, pollingStations, debouncedCallback]);

  const handleSubmit = () => {
    if (pollingStationNumber === "") {
      setShowAlert(true);
      return;
    }

    const parsedStationNumber = parsePollingStationNumber(pollingStationNumber);
    const pollingStation = pollingStations.find((pollingStation) => pollingStation.number === parsedStationNumber);

    if (pollingStation) {
      navigate(`./${pollingStation.id}`);
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
      <h2 className="form_title">
        {anotherEntry ? "Verder met een volgend stembureau?" : "Welk stembureau ga je invoeren?"}
      </h2>
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
            <Icon icon={<IconError aria-label={"bevat een fout"} />} color="error" />
          </span>
          <span>Voer een geldig nummer van een stembureau in om te beginnen</span>
        </div>
      )}
      <BottomBar type="form">
        <BottomBar.Row>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              handleSubmit();
            }}
          >
            Beginnen
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
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
          if (pollingStations.length === 0) {
            return <Alert type={"error"}>Geen stembureaus gevonden</Alert>;
          } else {
            return <PollingStationsList pollingStations={pollingStations} />;
          }
        })()}
      </details>
    </form>
  );
}
