import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { IconError } from "@/components/generated/icons";
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
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { type DataEntryStatusWithUserStatus, DataEntryUserStatus, getUrlForDataEntry } from "../utils/util";
import cls from "./DataEntryHome.module.css";
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

export interface DataEntryPickerProps {
  dataEntryWithStatus: DataEntryStatusWithUserStatus[];
}

export function DataEntryPicker({ dataEntryWithStatus }: DataEntryPickerProps) {
  const navigate = useNavigate();
  const { election } = useElection();
  const { refetch: refetchStatuses } = useElectionStatus();

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
      }}
    >
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
    </form>
  );
}
