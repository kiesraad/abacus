import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { t } from "@/i18n/translate";
import type { CommitteeCategory, CommitteeSessionStatus } from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import cls from "./CommitteeSessionStatus.module.css";

function CommitteeSessionStatusLabel(status: CommitteeSessionStatus, role: "coordinator" | "typist"): string {
  return t(`committee_session_status.${role}.${status}`);
}

export interface CommitteeSessionStatusWithIconProps {
  status: CommitteeSessionStatus;
  committeeCategory: CommitteeCategory;
  userRole: "coordinator" | "typist";
}

export function HeaderCommitteeSessionStatusWithIcon({
  status,
  committeeCategory,
  userRole,
  committeeSessionNumber,
}: CommitteeSessionStatusWithIconProps & {
  committeeSessionNumber: number;
}) {
  let sessionLabel: string | undefined;
  if (status === "completed" && userRole === "coordinator") {
    sessionLabel = `(${committeeSessionLabel(committeeCategory, committeeSessionNumber, false, true)})`;
  }
  return (
    <div className={cls.committee_session_status}>
      <span>
        <strong>{CommitteeSessionStatusLabel(status, userRole)}</strong> {sessionLabel}
      </span>
      {CommitteeSessionStatusIcon({ status, role: userRole })}
    </div>
  );
}

export function CommitteeSessionStatusWithIcon({ status, userRole }: CommitteeSessionStatusWithIconProps) {
  return (
    <div className={cls.committee_session_status}>
      {CommitteeSessionStatusIcon({ status, role: userRole })}
      <span>{CommitteeSessionStatusLabel(status, userRole)}</span>
    </div>
  );
}

export function CommitteeSessionStatusWithRightIcon({ status, userRole }: CommitteeSessionStatusWithIconProps) {
  return (
    <div className={cls.committee_session_status}>
      <span>{CommitteeSessionStatusLabel(status, userRole)}</span>
      {CommitteeSessionStatusIcon({ status, role: userRole })}
    </div>
  );
}
