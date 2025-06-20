import {
  IconCheckHeart,
  IconCheckVerified,
  IconClock,
  IconHourglass,
  IconSettings,
} from "@/components/generated/icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { t } from "@/i18n/translate";
import { CommitteeSessionStatus } from "@/types/generated/openapi";

function statusIcon(status: CommitteeSessionStatus, role: "coordinator" | "typist") {
  switch (status) {
    case "created":
    case "data_entry_not_started":
      return (
        <Icon
          size="md"
          color={role === "coordinator" ? "status-not-started" : "warning"}
          icon={role === "coordinator" ? <IconSettings /> : <IconClock />}
        />
      );
    case "data_entry_in_progress":
      return <Icon size="md" color="accept" icon={<IconCheckHeart />} />;
    case "data_entry_paused":
      return <Icon size="md" color="warning" icon={<IconHourglass />} />;
    case "data_entry_finished":
      return <Icon size="md" color="default" icon={<IconCheckVerified />} />;
  }
}

function statusLabel(status: CommitteeSessionStatus, role: "coordinator" | "typist"): string {
  switch (status) {
    case "created":
      return t(`committee_session_status.${role}.created`);
    case "data_entry_not_started":
      return t(`committee_session_status.${role}.data_entry_not_started`);
    case "data_entry_in_progress":
      return t(`committee_session_status.${role}.data_entry_in_progress`);
    case "data_entry_paused":
      return t(`committee_session_status.${role}.data_entry_paused`);
    case "data_entry_finished":
      return t(`committee_session_status.${role}.data_entry_finished`);
  }
}

export interface CommitteeSessionStatusWithIconProps {
  status: CommitteeSessionStatus;
  userRole: "coordinator" | "typist";
}

export function HeaderCommitteeSessionStatusWithIcon({ status, userRole }: CommitteeSessionStatusWithIconProps) {
  return (
    <>
      <span>
        <strong>{statusLabel(status, userRole)}</strong>
      </span>
      {statusIcon(status, userRole)}
    </>
  );
}

export function CommitteeSessionStatusWithIcon({ status, userRole }: CommitteeSessionStatusWithIconProps) {
  return (
    <>
      {statusIcon(status, userRole)}
      <span>{statusLabel(status, userRole)}</span>
    </>
  );
}
