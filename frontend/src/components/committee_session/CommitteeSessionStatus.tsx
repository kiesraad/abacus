import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { t } from "@/i18n/translate";
import type { CommitteeSessionStatus, ElectionRole } from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import cls from "./CommitteeSessionStatus.module.css";

function CommitteeSessionStatusLabel(
  electionRole: ElectionRole,
  status: CommitteeSessionStatus,
  role: "coordinator" | "typist",
): string {
  if (electionRole === "CSB") {
    return t("committee_session_status.session");
  }

  return t(`committee_session_status.${role}.${status}`);
}

export interface CommitteeSessionStatusWithIconProps {
  status: CommitteeSessionStatus;
  electionRole: ElectionRole;
  userRole: "coordinator" | "typist";
}

export function HeaderCommitteeSessionStatusWithIcon({
  status,
  electionRole,
  userRole,
  committeeSessionNumber,
}: CommitteeSessionStatusWithIconProps & {
  committeeSessionNumber: number;
}) {
  let sessionLabel: string | undefined;
  if (status === "completed" && userRole === "coordinator") {
    sessionLabel = `(${committeeSessionLabel(electionRole, committeeSessionNumber).toLowerCase()})`;
  }
  return (
    <div className={cls.committee_session_status}>
      <span>
        <strong>{CommitteeSessionStatusLabel(electionRole, status, userRole)}</strong> {sessionLabel}
      </span>
      {CommitteeSessionStatusIcon({ status: status, role: userRole })}
    </div>
  );
}

export function CommitteeSessionStatusWithIcon({
  electionRole,
  status,
  userRole,
}: CommitteeSessionStatusWithIconProps) {
  return (
    <div className={cls.committee_session_status}>
      {CommitteeSessionStatusIcon({ status: status, role: userRole })}
      <span>{CommitteeSessionStatusLabel(electionRole, status, userRole)}</span>
    </div>
  );
}

export function CommitteeSessionStatusWithRightIcon({
  electionRole,
  status,
  userRole,
}: CommitteeSessionStatusWithIconProps) {
  return (
    <div className={cls.committee_session_status}>
      <span>{CommitteeSessionStatusLabel(electionRole, status, userRole)}</span>
      {CommitteeSessionStatusIcon({ status: status, role: userRole })}
    </div>
  );
}
