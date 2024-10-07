import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PollingStation, useElection, useElectionStatus } from "@kiesraad/api";
import { IconError } from "@kiesraad/icon";
import { Alert, BottomBar, Button, Icon, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";
import { cn, parsePollingStationNumber, useDebouncedCallback } from "@kiesraad/util";

import { PollingStationLink } from "./PollingStationLink";
import { PollingStationSelector } from "./PollingStationSelector";
import cls from "./PollingStationSelector.module.css";
import { PollingStationsList } from "./PollingStationsList";

const USER_INPUT_DEBOUNCE: number = 500; // ms

export interface PollingStationChoiceFormProps {
  anotherEntry?: boolean;
}

const INVALID_POLLING_STATION_ALERT: string = "Voer een geldig nummer van een stembureau in om te beginnen";
const DEFINITIVE_POLLING_STATION_ALERT: string =
  "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden";

export function PollingStationChoiceForm({ anotherEntry }: PollingStationChoiceFormProps) {
  const navigate = useNavigate();

  const { pollingStations } = useElection();
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [alert, setAlert] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPollingStation, setCurrentPollingStation] = useState<PollingStation | undefined>(undefined);
  const electionStatus = useElectionStatus();
  const [inProgressAlert, setInProgressAlert] = useState<boolean>(true);

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
      setAlert(INVALID_POLLING_STATION_ALERT);
      return;
    }

    const parsedStationNumber = parsePollingStationNumber(pollingStationNumber);
    const pollingStation = pollingStations.find((pollingStation) => pollingStation.number === parsedStationNumber);
    const pollingStationStatusEntry = electionStatus.statuses.find((status) => status.id === pollingStation?.id);

    if (pollingStationStatusEntry?.status === "definitive") {
      setAlert(DEFINITIVE_POLLING_STATION_ALERT);
      setLoading(false);
      return;
    }

    if (pollingStation) {
      navigate(`./${pollingStation.id}`);
    } else {
      setAlert(INVALID_POLLING_STATION_ALERT);
      setLoading(false);
      return;
    }
  };

  const inProgress = electionStatus.statuses
    .filter((status) => status.status === "first_entry_in_progress")
    .map((status) => pollingStations.find((ps) => ps.id === status.id));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        return;
      }}
    >
      {inProgress.length > 0 && inProgressAlert && (
        <div className={cls["in-progress-alert"]}>
          <Alert
            type="notify"
            variant="no-icon"
            onClose={() => {
              setInProgressAlert(false);
            }}
          >
            <h2>Je hebt nog een openstaande invoer</h2>
            <p>
              Je bent begonnen met het invoeren van onderstaande stembureaus, maar hebt deze nog niet helemaal afgerond:
            </p>
            {inProgress.map((pollingStation) => {
              return pollingStation === undefined ? null : (
                <PollingStationLink key={pollingStation.id} pollingStation={pollingStation} />
              );
            })}
          </Alert>
        </div>
      )}
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
        setAlert={setAlert}
        handleSubmit={handleSubmit}
      />
      <p className="md">
        Klopt de naam van het stembureau met de naam op je papieren proces verbaal?
        <br />
        Dan kan je beginnen. Klopt de naam niet? Overleg met de coördinator.
      </p>
      {alert && (
        <div id="pollingStationSubmitFeedback" className={cn(cls.message, cls.submit, cls.error)}>
          <span className={cls.icon}>
            <Icon icon={<IconError aria-label={"bevat een fout"} />} color="error" />
          </span>
          <span>{alert}</span>
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
