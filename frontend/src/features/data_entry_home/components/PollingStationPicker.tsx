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
import type { ElectionId } from "@/types/generated/openapi";
import { KeyboardKey } from "@/types/ui";
import { cn } from "@/utils/classnames";
import { parseIntUserInput } from "@/utils/strings";
import { useAvailablePollingStations } from "../hooks/useAvailablePollingStations";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { type DataEntryStatusWithUserStatus, DataEntryUserStatus, getUrlForDataEntry } from "../utils/util";
import cls from "./PollingStationChoice.module.css";
import { PollingStationLink } from "./PollingStationLink";
import { PollingStationNumberInput } from "./PollingStationNumberInput";
import { PollingStationsList } from "./PollingStationsList";

const USER_INPUT_DEBOUNCE: number = 500; // ms

const STATUS_ALERTS: Partial<Record<DataEntryUserStatus, TranslationPath>> = {
  [DataEntryUserStatus.EntryNotAllowed]: "polling_station_choice.alert.entry_not_allowed",
  [DataEntryUserStatus.Finished]: "polling_station_choice.alert.finished",
  [DataEntryUserStatus.InProgressOtherUser]: "polling_station_choice.alert.in_progress_other_user",
  [DataEntryUserStatus.HasErrors]: "polling_station_choice.alert.has_errors",
  [DataEntryUserStatus.SecondEntryNotAllowed]: "polling_station_choice.alert.second_entry_not_allowed",
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
  electionId: ElectionId;
  dataEntries: DataEntryStatusWithUserStatus[];
}

function UnfinishedEntriesList({ electionId, dataEntries }: UnfinishedEntriesListProps) {
  return (
    <div className="mb-lg" id="unfinished-list">
      <Alert type="notify" variant="no-icon">
        <strong className="heading-md">{t("polling_station_choice.unfinished_input_title")}</strong>
        <p>{t("polling_station_choice.unfinished_input_content")}</p>
        {dataEntries.map(({ statusEntry }) => (
          <PollingStationLink key={statusEntry.data_entry_id} electionId={electionId} dataEntry={statusEntry} />
        ))}
      </Alert>
    </div>
  );
}

interface PollingStationListDetailsProps {
  electionId: ElectionId;
  availableDataEntries: DataEntryStatusWithUserStatus[];
  onToggle: () => void;
}

function PollingStationListDetails({ electionId, availableDataEntries, onToggle }: PollingStationListDetailsProps) {
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
        {availableDataEntries.length === 0 ? (
          <Alert type="notify" small>
            <p>{t("polling_station_choice.there_are_no_polling_stations_left_to_fill_in")}</p>
          </Alert>
        ) : (
          <PollingStationsList electionId={electionId} dataEntries={availableDataEntries} />
        )}
      </details>
    </div>
  );
}

export interface PollingStationPickerProps {
  anotherEntry?: boolean;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored after #2997
export function PollingStationPicker({ anotherEntry }: PollingStationPickerProps) {
  const navigate = useNavigate();
  const { election } = useElection();
  const { refetch: refetchStatuses } = useElectionStatus();
  const { dataEntryWithStatus, availableCurrentUser, inProgressCurrentUser } = useAvailablePollingStations();
  const [number, setNumber] = useState<string>("");
  const [alert, setAlert] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const currentDataEntry = useMemo(() => {
    const parsedInt = parseIntUserInput(number);
    return dataEntryWithStatus.find(({ statusEntry }) => statusEntry.source.number === parsedInt);
  }, [number, dataEntryWithStatus]);

  const debouncedCallback = useDebouncedCallback(() => {
    void refetchStatuses().then(() => {
      setLoading(false);
    });
  }, USER_INPUT_DEBOUNCE);

  // set polling station number and trigger debounced lookup
  const updateNumber = (n: string) => {
    setNumber(n);
    setLoading(true);
    debouncedCallback();
  };

  const handleSubmit = () => {
    if (!currentDataEntry) {
      setAlert(t("polling_station_choice.enter_a_valid_number_to_start"));
      setLoading(false);
      return;
    }

    const alertMessage = STATUS_ALERTS[currentDataEntry.userStatus];
    if (alertMessage) {
      setAlert(
        t(alertMessage, {
          nr: currentDataEntry.statusEntry.source.number,
          name: currentDataEntry.statusEntry.source.name,
        }),
      );
      setLoading(false);
      return;
    }

    void navigate(getUrlForDataEntry(election.id, currentDataEntry.statusEntry));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {inProgressCurrentUser.length > 0 && (
        <UnfinishedEntriesList electionId={election.id} dataEntries={inProgressCurrentUser} />
      )}
      <fieldset>
        <legend className="mb-sm">
          <h2>
            {anotherEntry ? t("polling_station_choice.insert_another") : t("polling_station_choice.insert_title")}
          </h2>
        </legend>
        <PollingStationNumberInput
          number={number}
          updateNumber={updateNumber}
          loading={loading}
          setLoading={setLoading}
          currentDataEntry={currentDataEntry}
          setAlert={setAlert}
          handleSubmit={handleSubmit}
          refetchStatuses={() => void refetchStatuses()}
        />
        <p className="mb-lg">{tx("polling_station_choice.name_correct_warning")}</p>
        {alert && <AlertMessage message={alert} />}
        <BottomBar type="form">
          <BottomBar.Row>
            <Button onClick={handleSubmit}>{t("start")}</Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      </fieldset>
      <PollingStationListDetails
        electionId={election.id}
        availableDataEntries={availableCurrentUser}
        onToggle={() => void refetchStatuses()}
      />
    </form>
  );
}
