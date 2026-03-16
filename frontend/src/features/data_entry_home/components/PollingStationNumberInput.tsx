import type { Dispatch, ReactNode, SetStateAction } from "react";

import { IconError, IconWarning } from "@/components/generated/icons";
import { Badge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { InputField } from "@/components/ui/InputField/InputField";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { useUser } from "@/hooks/user/useUser.ts";
import { t, tx } from "@/i18n/translate";
import { cn } from "@/utils/classnames";
import { removeLeadingZeros } from "@/utils/strings";
import { useSingleCall } from "../hooks/useSingleCall";
import { type DataEntryStatusWithUserStatus, DataEntryUserStatus } from "../utils/util";
import cls from "./PollingStationChoice.module.css";

interface FeedbackMessageProps {
  messageType: "notify" | "warning" | "error" | "success";
  content: ReactNode;
  icon?: ReactNode;
}

const FeedbackMessage = ({ messageType, content, icon }: FeedbackMessageProps) => (
  <div id="pollingStationNumberInputFeedback" className={cn(cls.message, cls[messageType])}>
    {icon && (
      <span className={cls.icon}>
        <Icon
          icon={icon}
          color={messageType === "error" ? "error" : messageType === "warning" ? "warning" : undefined}
        />
      </span>
    )}
    {content}
  </div>
);

export interface PollingStationNumberInputProps {
  number: string;
  updateNumber: (n: string) => void;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  currentDataEntry: DataEntryStatusWithUserStatus | undefined;
  setAlert: Dispatch<SetStateAction<string | undefined>>;
  handleSubmit: () => void;
  refetchStatuses: () => void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function PollingStationNumberInput({
  number,
  updateNumber,
  loading,
  currentDataEntry,
  setAlert,
  handleSubmit,
  refetchStatuses,
}: PollingStationNumberInputProps) {
  const [refetch, reset] = useSingleCall(refetchStatuses);
  const user = useUser();
  if (!user) {
    return null;
  }

  const renderWarningMessage = (content: ReactNode) => (
    <FeedbackMessage
      messageType="warning"
      content={content}
      icon={<IconWarning aria-label={t("contains_warning")} aria-hidden="false" />}
    />
  );

  const getFeedbackContent = () => {
    if (loading) {
      return (
        <FeedbackMessage
          messageType="notify"
          content={<>{t("polling_station_choice.searching")} &hellip;</>}
          icon={<Spinner size="md" />}
        />
      );
    }

    if (currentDataEntry) {
      const { number: nr, name } = currentDataEntry.statusEntry.source;

      switch (currentDataEntry.userStatus) {
        case DataEntryUserStatus.InProgressOtherUser:
          return renderWarningMessage(
            tx("polling_station_choice.alert.in_progress_other_user_selector", undefined, { nr }),
          );
        case DataEntryUserStatus.SecondEntryNotAllowed:
          return renderWarningMessage(tx("polling_station_choice.alert.second_entry_not_allowed", undefined, { nr }));
        case DataEntryUserStatus.HasErrors:
          return renderWarningMessage(tx("polling_station_choice.alert.has_errors", undefined, { nr }));
        case DataEntryUserStatus.Finished:
          return renderWarningMessage(tx("polling_station_choice.alert.finished_selector", undefined, { nr, name }));
        case DataEntryUserStatus.EntryNotAllowed:
          return renderWarningMessage(tx("polling_station_choice.alert.entry_not_allowed", undefined, { nr }));
        default:
          return (
            <FeedbackMessage
              messageType="success"
              content={
                <>
                  <span className="bold">{name}</span>
                  <Badge type={currentDataEntry.statusEntry.status} userRole={user.role} showIcon />
                </>
              }
            />
          );
      }
    }

    return (
      <FeedbackMessage
        messageType="error"
        content={t("polling_station_choice.no_polling_station_found_with_number", {
          nr: removeLeadingZeros(number),
        })}
        icon={<IconError aria-label={t("contains_error")} aria-hidden="false" />}
      />
    );
  };

  return (
    <div className={cls.container}>
      <InputField
        id="pollingStation"
        className={cn(cls.input, "font-number")}
        name="number"
        value={number}
        label={t("polling_station_choice.insert_number")}
        fieldWidth="narrow"
        maxLength={6}
        autoFocus={true}
        onChange={(e) => {
          setAlert(undefined);
          updateNumber(e.target.value);
        }}
        onKeyDown={(e) => {
          refetch();
          if (e.shiftKey && e.key === "Enter") {
            handleSubmit();
          }
        }}
        onBlur={reset}
        margin="mb-lg"
      />

      {number.trim() !== "" && getFeedbackContent()}
    </div>
  );
}
