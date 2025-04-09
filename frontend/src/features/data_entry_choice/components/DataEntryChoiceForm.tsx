import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { useElection, useElectionStatus, useUser } from "@/api";
import { Alert, BottomBar, Button, Icon, KeyboardKey, KeyboardKeys } from "@/components/ui";
import { t, tx } from "@/lib/i18n";
import { IconError } from "@/lib/icon";
import { cn, parseIntUserInput } from "@/lib/util";

import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import {
  finishedStatuses,
  getPollingStationWithStatusList,
  getUrlForDataEntry,
  PollingStationUserStatus,
  PollingStationWithStatus,
} from "../utils/util";
import cls from "./DataEntryChoice.module.css";
import { PollingStationLink } from "./PollingStationLink";
import { PollingStationSelector } from "./PollingStationSelector";
import { PollingStationsList } from "./PollingStationsList";

const USER_INPUT_DEBOUNCE: number = 500; // ms

export interface DataEntryChoiceFormProps {
  anotherEntry?: boolean;
}

const INVALID_POLLING_STATION_ALERT: string = t("polling_station_choice.enter_a_valid_number_to_start");
const DEFINITIVE_POLLING_STATION_ALERT: string = t("polling_station_choice.polling_station_entry_not_possible");

export function DataEntryChoiceForm({ anotherEntry }: DataEntryChoiceFormProps) {
  const navigate = useNavigate();
  const user = useUser();

  const { election, pollingStations } = useElection();
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [alert, setAlert] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPollingStation, setCurrentPollingStation] = useState<PollingStationWithStatus | undefined>(undefined);
  const electionStatus = useElectionStatus();

  const pollingStationsWithStatus = useMemo(() => {
    return getPollingStationWithStatusList({
      pollingStations,
      statuses: electionStatus.statuses,
      user,
    });
  }, [electionStatus, pollingStations, user]);

  const debouncedCallback = useDebouncedCallback((pollingStation: PollingStationWithStatus | undefined) => {
    setLoading(false);
    setCurrentPollingStation(pollingStation);
  }, USER_INPUT_DEBOUNCE);

  useMemo(() => {
    const parsedInt = parseIntUserInput(pollingStationNumber);
    setLoading(true);
    debouncedCallback(pollingStationsWithStatus.find((pollingStation) => pollingStation.number === parsedInt));
  }, [pollingStationNumber, pollingStationsWithStatus, debouncedCallback]);

  const handleSubmit = () => {
    if (pollingStationNumber === "") {
      setAlert(INVALID_POLLING_STATION_ALERT);
      return;
    }

    const parsedStationNumber = parseIntUserInput(pollingStationNumber);
    const pollingStation = pollingStationsWithStatus.find(
      (pollingStation) => pollingStation.number === parsedStationNumber,
    );

    if (!pollingStation) {
      setAlert(INVALID_POLLING_STATION_ALERT);
      setLoading(false);
      return;
    }

    if (pollingStation.userStatus === PollingStationUserStatus.Finished) {
      setAlert(DEFINITIVE_POLLING_STATION_ALERT);
      setLoading(false);
      return;
    }

    if (pollingStation.userStatus === PollingStationUserStatus.InProgressOtherUser) {
      setAlert(
        t("polling_station_choice.polling_station_in_progress_different_user", {
          nr: pollingStation.number,
          name: pollingStation.name,
        }),
      );
      setLoading(false);
      return;
    }

    void navigate(getUrlForDataEntry(election.id, pollingStation.id, pollingStation.statusEntry.status));
  };

  const available = pollingStationsWithStatus.filter(
    (pollingStation) =>
      !finishedStatuses.includes(pollingStation.statusEntry.status) &&
      pollingStation.userStatus !== PollingStationUserStatus.SecondEntryNotAllowed,
  );
  const availableCurrentUser = available.filter(
    (pollingStation) => pollingStation.userStatus !== PollingStationUserStatus.InProgressOtherUser,
  );
  const inProgressCurrentUser = availableCurrentUser.filter(
    (pollingStation) => pollingStation.userStatus === PollingStationUserStatus.InProgressCurrentUser,
  );

  if (!user) {
    return <Navigate to="/account/login" />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        return;
      }}
    >
      {inProgressCurrentUser.length > 0 && (
        <div className="mb-lg" id="unfinished-list">
          <Alert type="notify" variant="no-icon">
            <h2>{t("polling_station_choice.unfinished_input_title")}</h2>
            <p>{t("polling_station_choice.unfinished_input_content")}</p>
            {inProgressCurrentUser.map((pollingStation) => (
              <PollingStationLink
                key={pollingStation.id}
                pollingStation={pollingStation}
                status={pollingStation.statusEntry.status}
              />
            ))}
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
          setAlert={setAlert}
          handleSubmit={handleSubmit}
        />
        <p className="md">{tx("polling_station_choice.name_correct_warning")}</p>
        {alert && (
          <div id="pollingStationSubmitFeedback" className={cn(cls.message, cls.submit, cls.error)}>
            <span className={cls.icon}>
              <Icon icon={<IconError aria-label={t("contains_error")} />} color="error" />
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
      <div className={cls.dataEntryList}>
        <details>
          <summary>
            {t("polling_station_choice.unknown_number")}
            <br />
            <span id="openPollingStationList" className={cn(cls.underlined, cls.pointer)}>
              {t("polling_station_choice.view_list")}
            </span>
          </summary>
          <h2 className={cls.formTitle}>{t("polling_station_choice.choose_polling_station")}</h2>
          {!pollingStations.length ? (
            <Alert type="error" variant="small">
              <p>{t("polling_station_choice.no_polling_stations_found")}</p>
            </Alert>
          ) : !available.length ? (
            <Alert type="notify" variant="small">
              <p>{t("polling_station_choice.all_polling_stations_filled_in_twice")}</p>
            </Alert>
          ) : (
            <PollingStationsList pollingStations={availableCurrentUser} />
          )}
        </details>
      </div>
    </form>
  );
}
