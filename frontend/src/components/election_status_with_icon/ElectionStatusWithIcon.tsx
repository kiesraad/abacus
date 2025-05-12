import { IconCheckHeart, IconCheckVerified, IconCompass } from "@/components/generated/icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { t } from "@/lib/i18n";
import { ElectionStatus } from "@/types/generated/openapi";

function statusIcon(status: ElectionStatus) {
  switch (status) {
    case "Created":
      return <Icon size="md" color="not-started" icon={<IconCompass />} />;
    case "DataEntryInProgress":
      return <Icon size="md" color="accept" icon={<IconCheckHeart />} />;
    case "DataEntryFinished":
      return <Icon size="md" color="default" icon={<IconCheckVerified />} />;
  }
}

function statusLabel(status: ElectionStatus, role: "coordinator" | "typist"): string {
  switch (status) {
    case "Created":
      return t(`election_status.${role}.data_entry_not_started`);
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
