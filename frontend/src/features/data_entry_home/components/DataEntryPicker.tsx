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
import { useAvailableDataEntries } from "../hooks/useAvailableDataEntries";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { type DataEntryStatusWithUserStatus, DataEntryUserStatus, getUrlForDataEntry } from "../utils/util";
import cls from "./DataEntryHome.module.css";
import { DataEntryLink } from "./DataEntryLink";
import { DataEntryList } from "./DataEntryList";
import { DataEntrySourceNumberInput } from "./DataEntrySourceNumberInput";

const USER_INPUT_DEBOUNCE: number = 500; // ms

const STATUS_ALERTS: Partial<Record<DataEntryUserStatus, TranslationPath>> = {
  [DataEntryUserStatus.Finished]: "data_entry_home.alert.finished",
  [DataEntryUserStatus.InProgressOtherUser]: "data_entry_home.alert.in_progress_other_user",
  [DataEntryUserStatus.HasErrors]: "data_entry_home.alert.has_errors",
  [DataEntryUserStatus.SecondEntryNotAllowed]: "data_entry_home.alert.second_entry_not_allowed",
};

interface AlertMessageProps {
  message: string;
}

function AlertMessage({ message }: AlertMessageProps) {
  return (
    <div id="submitFeedback" className={cn(cls.message, cls.submit, cls.error)}>
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
        <strong className="heading-md">{t("data_entry_home.unfinished_input_title")}</strong>
        <p>{t("data_entry_home.unfinished_input_content")}</p>
        {dataEntries.map(({ statusEntry }) => (
          <DataEntryLink key={statusEntry.data_entry_id} electionId={electionId} dataEntry={statusEntry} />
        ))}
      </Alert>
    </div>
  );
}

interface CollapsibleDataEntryListProps {
  electionId: ElectionId;
  availableDataEntries: DataEntryStatusWithUserStatus[];
  onToggle: () => void;
}

function CollapsibleDataEntryList({ electionId, availableDataEntries, onToggle }: CollapsibleDataEntryListProps) {
  return (
    <div className={cls.dataEntryList}>
      <details onToggle={onToggle}>
        <summary>
          {t("data_entry_home.unknown_number")}
          <br />
          <span id="openList" className={cn("underlined", cls.pointer)}>
            {t("data_entry_home.view_list")}
          </span>
        </summary>
        <h3 className="mb-lg">{t("data_entry_home.choose_polling_station")}</h3>
        {availableDataEntries.length === 0 ? (
          <Alert type="notify" small>
            <p>{t("data_entry_home.there_are_no_polling_stations_left_to_fill_in")}</p>
          </Alert>
        ) : (
          <DataEntryList electionId={electionId} dataEntries={availableDataEntries} />
        )}
      </details>
    </div>
  );
}

export interface DataEntryPickerProps {
  anotherEntry?: boolean;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored after #2997
export function DataEntryPicker({ anotherEntry }: DataEntryPickerProps) {
  const navigate = useNavigate();
  const { election } = useElection();
  const { refetch: refetchStatuses } = useElectionStatus();
  const { dataEntryWithStatus, availableCurrentUser, inProgressCurrentUser } = useAvailableDataEntries();
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

  // set number and trigger debounced lookup
  const updateNumber = (n: string) => {
    setNumber(n);
    setLoading(true);
    debouncedCallback();
  };

  const handleSubmit = () => {
    if (!currentDataEntry) {
      setAlert(t("data_entry_home.enter_a_valid_number_to_start"));
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
        handleSubmit();
      }}
    >
      {inProgressCurrentUser.length > 0 && (
        <UnfinishedEntriesList electionId={election.id} dataEntries={inProgressCurrentUser} />
      )}
      <fieldset>
        <legend className="mb-sm">
          <h2>{anotherEntry ? t("data_entry_home.insert_another") : t("data_entry_home.insert_title")}</h2>
        </legend>
        <DataEntrySourceNumberInput
          number={number}
          updateNumber={updateNumber}
          loading={loading}
          setLoading={setLoading}
          currentDataEntry={currentDataEntry}
          setAlert={setAlert}
          handleSubmit={handleSubmit}
          refetchStatuses={() => void refetchStatuses()}
        />
        <p className="mb-lg">{tx("data_entry_home.name_correct_warning")}</p>
        {alert && <AlertMessage message={alert} />}
        <BottomBar type="form">
          <BottomBar.Row>
            <Button onClick={handleSubmit}>{t("start")}</Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      </fieldset>
      <CollapsibleDataEntryList
        electionId={election.id}
        availableDataEntries={availableCurrentUser}
        onToggle={() => void refetchStatuses()}
      />
    </form>
  );
}
