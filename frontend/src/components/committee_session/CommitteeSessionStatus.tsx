import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { t } from "@/i18n/translate";
import { CommitteeSessionStatus } from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

export function CommitteeSessionStatusLabel(status: CommitteeSessionStatus, role: "coordinator" | "typist"): string {
  return t(`committee_session_status.${role}.${status}`);
}

export interface CommitteeSessionStatusWithIconProps {
  status: CommitteeSessionStatus;
  userRole: "coordinator" | "typist";
}

export function HeaderCommitteeSessionStatusWithIcon({
  status,
  userRole,
  committeeSessionNumber,
}: CommitteeSessionStatusWithIconProps & { committeeSessionNumber: number }) {
  let sessionLabel = undefined;
  if (status === "data_entry_finished" && userRole === "coordinator") {
    sessionLabel = `(${committeeSessionLabel(committeeSessionNumber).toLowerCase()})`;
  }
  return (
    <>
      <span>
        <strong>{CommitteeSessionStatusLabel(status, userRole)}</strong> {sessionLabel}
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
