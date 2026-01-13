import type { Dispatch, ReactNode, SetStateAction } from "react";

import { IconError, IconWarning } from "@/components/generated/icons";
import { Badge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { InputField } from "@/components/ui/InputField/InputField";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { t, tx } from "@/i18n/translate";
import { cn } from "@/utils/classnames";
import { removeLeadingZeros } from "@/utils/strings";

import { useSingleCall } from "../hooks/useSingleCall";
import { PollingStationUserStatus, type PollingStationWithStatus } from "../utils/util";
import cls from "./PollingStationChoice.module.css";

interface FeedbackMessageProps {
  messageType: "notify" | "warning" | "error" | "success";
  content: ReactNode;
  icon?: ReactNode;
}

const FeedbackMessage = ({ messageType, content, icon }: FeedbackMessageProps) => (
  <div id="pollingStationSelectorFeedback" className={cn(cls.message, cls[messageType])}>
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

export interface PollingStationSelectorProps {
  pollingStationNumber: string;
  updatePollingStationNumber: (n: string) => void;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  currentPollingStation: PollingStationWithStatus | undefined;
  setAlert: Dispatch<SetStateAction<string | undefined>>;
  handleSubmit: () => void;
  refetchStatuses: () => void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function PollingStationSelector({
  pollingStationNumber,
  updatePollingStationNumber,
  loading,
  currentPollingStation,
  setAlert,
  handleSubmit,
  refetchStatuses,
}: PollingStationSelectorProps) {
  const [refetch, reset] = useSingleCall(refetchStatuses);

  const renderWarningMessage = (content: ReactNode) => (
    <FeedbackMessage
      messageType="warning"
      content={content}
      icon={<IconWarning aria-label={t("contains_warning")} aria-hidden="false" />}
    />
  );

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
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

    if (currentPollingStation) {
      switch (currentPollingStation.userStatus) {
        case PollingStationUserStatus.InProgressOtherUser:
          return renderWarningMessage(
            tx("polling_station_choice.alert.in_progress_other_user_selector", undefined, {
              nr: currentPollingStation.number,
            }),
          );
        case PollingStationUserStatus.SecondEntryNotAllowed:
          return renderWarningMessage(
            tx("polling_station_choice.alert.second_entry_not_allowed", undefined, {
              nr: currentPollingStation.number,
            }),
          );
        case PollingStationUserStatus.HasErrors:
          return renderWarningMessage(
            tx("polling_station_choice.alert.has_errors", undefined, {
              nr: currentPollingStation.number,
            }),
          );
        case PollingStationUserStatus.Finished:
          return renderWarningMessage(
            tx("polling_station_choice.alert.finished_selector", undefined, {
              nr: currentPollingStation.number,
              name: currentPollingStation.name,
            }),
          );
        case PollingStationUserStatus.EntryNotAllowed:
          return renderWarningMessage(
            tx("polling_station_choice.alert.entry_not_allowed", undefined, {
              nr: currentPollingStation.number,
            }),
          );
        default:
          if (currentPollingStation.statusEntry) {
            return (
              <FeedbackMessage
                messageType="success"
                content={
                  <>
                    <span className="bold">{currentPollingStation.name}</span>
                    <Badge type={currentPollingStation.statusEntry.status} showIcon />
                  </>
                }
              />
            );
          }
      }
    }

    return (
      <FeedbackMessage
        messageType="error"
        content={t("polling_station_choice.no_polling_station_found_with_number", {
          nr: removeLeadingZeros(pollingStationNumber),
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
        value={pollingStationNumber}
        label={t("polling_station_choice.insert_number")}
        fieldWidth="narrow"
        maxLength={6}
        autoFocus={true}
        onChange={(e) => {
          setAlert(undefined);
          updatePollingStationNumber(e.target.value);
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

      {pollingStationNumber.trim() !== "" && getFeedbackContent()}
    </div>
  );
}
