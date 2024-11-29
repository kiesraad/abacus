import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PollingStation, useElection, useElectionStatus } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { IconError } from "@kiesraad/icon";
import { Alert, BottomBar, Button, Icon, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";
import { cn, parsePollingStationNumber, useDebouncedCallback } from "@kiesraad/util";

import cls from "./PollingStationChoiceForm.module.css";
import { PollingStationLink } from "./PollingStationLink";
import { PollingStationSelector } from "./PollingStationSelector";
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

  const unfinished = electionStatus.statuses
    .filter((status) => status.status === "first_entry_unfinished" || status.status === "first_entry_in_progress")
    .map((status) => pollingStations.find((ps) => ps.id === status.id));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        return;
      }}
    >
      {unfinished.length > 0 && (
        <div className="mb-lg">
          <Alert type="notify" variant="no-icon">
            <h2>{t("polling_station_choice.unfinished_input_title")}</h2>
            <p>{t("polling_station_choice.unfinished_input_content")}</p>
            {unfinished.map((pollingStation) => {
              return pollingStation === undefined ? null : (
                <PollingStationLink key={pollingStation.id} pollingStation={pollingStation} />
              );
            })}
          </Alert>
        </div>
      )}
      <fieldset>
        <legend className="heading-lg mb-lg">
          {anotherEntry ? t("polling_station_choice.insert_another") : t("polling_station_choice.insert_title")}
        </legend>
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
        <p className="md">{tx("polling_station_choice.name_correct_warning")}</p>
        {alert && (
          <div id="pollingStationSubmitFeedback" className={cn(cls.message, cls.submit, cls.error)}>
            <span className={cls.icon}>
              <Icon icon={<IconError aria-label={t("polling_station_choice.contains_error")} />} color="error" />
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
              {t("start")}
            </Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      </fieldset>
      <div className={cls.pollingStationList}>
        <details>
          <summary>
            {t("polling_station_choice.unknown_number")}
            <br />
            <span id="openPollingStationList" className={cn(cls.underlined, cls.pointer)}>
              {t("polling_station_choice.view_list")}
            </span>
          </summary>
          <h2 className={cls.formTitle}>{t("polling_station_choice.choose_polling_station")}</h2>
          {pollingStations.length === 0 ? (
            <Alert type="error" variant="small">
              <p>{t("polling_station_choice.no_polling_stations_found")}</p>
            </Alert>
          ) : (
            <PollingStationsList pollingStations={pollingStations} />
          )}
        </details>
      </div>
    </form>
  );
}
