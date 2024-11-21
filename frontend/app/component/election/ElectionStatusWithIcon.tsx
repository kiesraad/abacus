import { ElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconCheckHeart, IconCheckVerified } from "@kiesraad/icon";
import { Icon } from "@kiesraad/ui";

function statusIcon(status: ElectionStatus) {
  switch (status) {
    case "DataEntryInProgress":
      return <Icon size="md" color="accept" icon={<IconCheckHeart />} />;
    case "DataEntryFinished":
      return <Icon size="md" color="default" icon={<IconCheckVerified />} />;
  }
}

function statusLabel(status: ElectionStatus, role: "coordinator" | "typist"): string {
  switch (status) {
    case "DataEntryInProgress":
      return t(`election_status.${role}.data_entry_in_progress`);
    case "DataEntryFinished":
      return t(`election_status.${role}.data_entry_finished`);
  }
}

export interface ElectionStatusWithIconProps {
  status: ElectionStatus;
  userRole: "coordinator" | "typist";
}

export function HeaderElectionStatusWithIcon({ status, userRole }: ElectionStatusWithIconProps) {
  return (
    <>
      <span>
        <strong>{statusLabel(status, userRole)}</strong> ({t("election_status.first_session").toLowerCase()})
      </span>
      {statusIcon(status)}
    </>
  );
}

export function ElectionStatusWithIcon({ status, userRole }: ElectionStatusWithIconProps) {
  return (
    <>
      {statusIcon(status)}
      <span>{statusLabel(status, userRole)}</span>
    </>
  );
}
