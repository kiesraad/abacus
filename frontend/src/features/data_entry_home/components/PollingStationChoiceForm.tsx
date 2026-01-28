import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { IconError } from "@/components/generated/icons";
import { Alert } from "@/components/ui/Alert/Alert";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import type { TranslationPath } from "@/i18n/i18n.types";
import { t, tx } from "@/i18n/translate";
import { KeyboardKey } from "@/types/ui";
import { cn } from "@/utils/classnames";
import { parseIntUserInput } from "@/utils/strings";

import { useAvailablePollingStations } from "../hooks/useAvailablePollingStations";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { getUrlForDataEntry, PollingStationUserStatus, type PollingStationWithStatus } from "../utils/util";
import cls from "./PollingStationChoice.module.css";
import { PollingStationLink } from "./PollingStationLink";
import { PollingStationNumberInput } from "./PollingStationNumberInput";
import { PollingStationsList } from "./PollingStationsList";

const USER_INPUT_DEBOUNCE: number = 500; // ms

const STATUS_ALERTS: Partial<Record<PollingStationUserStatus, TranslationPath>> = {
  [PollingStationUserStatus.EntryNotAllowed]: "polling_station_choice.alert.entry_not_allowed",
  [PollingStationUserStatus.Finished]: "polling_station_choice.alert.finished",
  [PollingStationUserStatus.InProgressOtherUser]: "polling_station_choice.alert.in_progress_other_user",
  [PollingStationUserStatus.HasErrors]: "polling_station_choice.alert.has_errors",
  [PollingStationUserStatus.SecondEntryNotAllowed]: "polling_station_choice.alert.second_entry_not_allowed",
};

interface AlertMessageProps {
  message: string;
}

function AlertMessage({ message }: AlertMessageProps) {
  return (
    <div id="pollingStationSubmitFeedback" className={cn(cls.message, cls.submit, cls.error)}>
      <span className={cls.icon}>
        <Icon icon={<IconError aria-label={t("contains_error")} aria-hidden="false" />} color="error" />
      </span>
      <span>{message}</span>
    </div>
  );
}

interface UnfinishedEntriesListProps {
  pollingStations: PollingStationWithStatus[];
}

function UnfinishedEntriesList({ pollingStations }: UnfinishedEntriesListProps) {
  return (
    <div className="mb-lg" id="unfinished-list">
      <Alert type="notify" variant="no-icon">
        <strong className="heading-md">{t("polling_station_choice.unfinished_input_title")}</strong>
        <p>{t("polling_station_choice.unfinished_input_content")}</p>
        {pollingStations.map(
          (pollingStation) =>
            pollingStation.statusEntry && (
              <PollingStationLink
                key={pollingStation.id}
                pollingStation={pollingStation}
                status={pollingStation.statusEntry.status}
              />
            ),
        )}
      </Alert>
    </div>
  );
}

interface PollingStationListDetailsProps {
  availablePollingStations: PollingStationWithStatus[];
  hasAnyPollingStations: boolean;
  onToggle: () => void;
}

function PollingStationListDetails({
  availablePollingStations,
  hasAnyPollingStations,
  onToggle,
}: PollingStationListDetailsProps) {
  return (
    <div className={cls.dataEntryList}>
      <details onToggle={onToggle}>
        <summary>
          {t("polling_station_choice.unknown_number")}
          <br />
          <span id="openPollingStationList" className={cn("underlined", cls.pointer)}>
            {t("polling_station_choice.view_list")}
          </span>
        </summary>
        <h3 className="mb-lg">{t("polling_station_choice.choose_polling_station")}</h3>
        {!hasAnyPollingStations ? (
          <Alert type="error" small>
            <p>{t("no_polling_stations_found")}</p>
          </Alert>
        ) : !availablePollingStations.length ? (
          <Alert type="notify" small>
            <p>{t("polling_station_choice.there_are_no_polling_stations_left_to_fill_in")}</p>
          </Alert>
        ) : (
          <PollingStationsList pollingStations={availablePollingStations} />
        )}
      </details>
    </div>
  );
}

export interface PollingStationChoiceFormProps {
  anotherEntry?: boolean;
}

export function PollingStationChoiceForm({ anotherEntry }: PollingStationChoiceFormProps) {
  const navigate = useNavigate();
  const { election, pollingStations } = useElection();
  const { refetch: refetchStatuses } = useElectionStatus();
  const { pollingStationsWithStatus, availableCurrentUser, inProgressCurrentUser } = useAvailablePollingStations();
  const [pollingStationNumber, setPollingStationNumber] = useState<string>("");
  const [alert, setAlert] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const currentPollingStation = useMemo(() => {
    const parsedInt = parseIntUserInput(pollingStationNumber);
    return pollingStationsWithStatus.find((ps) => ps.number === parsedInt);
  }, [pollingStationNumber, pollingStationsWithStatus]);

  const debouncedCallback = useDebouncedCallback(() => {
    void refetchStatuses().then(() => {
      setLoading(false);
    });
  }, USER_INPUT_DEBOUNCE);

  // set polling station number and trigger debounced lookup
  const updatePollingStationNumber = (n: string) => {
    setPollingStationNumber(n);
    setLoading(true);
    debouncedCallback();
  };

  const handleSubmit = () => {
    if (!currentPollingStation) {
      setAlert(t("polling_station_choice.enter_a_valid_number_to_start"));
      setLoading(false);
      return;
    }

    const alertMessage = STATUS_ALERTS[currentPollingStation.userStatus];
    if (alertMessage) {
      setAlert(t(alertMessage, { nr: currentPollingStation.number, name: currentPollingStation.name }));
      setLoading(false);
      return;
    }

    void navigate(getUrlForDataEntry(election.id, currentPollingStation.id, currentPollingStation.statusEntry?.status));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {inProgressCurrentUser.length > 0 && <UnfinishedEntriesList pollingStations={inProgressCurrentUser} />}
      <fieldset>
        <legend className="mb-sm">
          <h2>
            {anotherEntry ? t("polling_station_choice.insert_another") : t("polling_station_choice.insert_title")}
          </h2>
        </legend>
        <PollingStationNumberInput
          pollingStationNumber={pollingStationNumber}
          updatePollingStationNumber={updatePollingStationNumber}
          loading={loading}
          setLoading={setLoading}
          currentPollingStation={currentPollingStation}
          setAlert={setAlert}
          handleSubmit={handleSubmit}
          refetchStatuses={() => void refetchStatuses()}
        />
        <p className="mb-lg">{tx("polling_station_choice.name_correct_warning")}</p>
        {alert && <AlertMessage message={alert} />}
        <BottomBar type="form">
          <BottomBar.Row>
            <Button type="button" onClick={handleSubmit}>
              {t("start")}
            </Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      </fieldset>
      <PollingStationListDetails
        availablePollingStations={availableCurrentUser}
        hasAnyPollingStations={pollingStations.length > 0}
        onToggle={() => void refetchStatuses()}
      />
    </form>
  );
}
