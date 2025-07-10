import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { t } from "@/i18n/translate";
import { CommitteeSessionStatus } from "@/types/generated/openapi";

export function CommitteeSessionStatusLabel(status: CommitteeSessionStatus, role: "coordinator" | "typist"): string {
  return t(`committee_session_status.${role}.${status}`);
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
