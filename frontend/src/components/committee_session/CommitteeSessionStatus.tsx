import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { t } from "@/i18n/translate";
import { CommitteeSessionStatus } from "@/types/generated/openapi";

export function CommitteeSessionStatusLabel(status: CommitteeSessionStatus, role: "coordinator" | "typist"): string {
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
        <strong>{CommitteeSessionStatusLabel(status, userRole)}</strong>
      </span>
      {CommitteeSessionStatusIcon({ status: status, role: userRole })}
    </>
  );
}

export function CommitteeSessionStatusWithIcon({ status, userRole }: CommitteeSessionStatusWithIconProps) {
  return (
    <>
      {CommitteeSessionStatusIcon({ status: status, role: userRole })}
      <span>{CommitteeSessionStatusLabel(status, userRole)}</span>
    </>
  );
}
