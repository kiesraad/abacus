import { ElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconCheckHeart, IconCheckVerified, IconLock } from "@kiesraad/icon";
import { Icon } from "@kiesraad/ui";

function getIconForElectionStatus(status: ElectionStatus) {
  switch (status) {
    case "DataEntryInProgress":
      return <Icon size="md" color="accept" icon={<IconCheckHeart />} />;
    case "FinishDataEntry":
      return <Icon size="md" color="error" icon={<IconLock />} />;
    case "DataEntryFinished":
      return <Icon size="md" color="default" icon={<IconCheckVerified />} />;
  }
}

export function ElectionStatusWithIcon(status: ElectionStatus, header: boolean, isAdministrator: boolean) {
  let statusLabel;
  switch (status) {
    case "DataEntryInProgress":
      statusLabel = t(`election_status.${isAdministrator ? "coordinator" : "typist"}.data_entry_in_progress`);
      break;
    case "FinishDataEntry":
      statusLabel = t("election_status.coordinator.finish_data_entry");
      break;
    case "DataEntryFinished":
      statusLabel = t(`election_status.${isAdministrator ? "coordinator" : "typist"}.data_entry_finished`);
      break;
  }
  if (header) {
    return (
      <>
        <span>
          <strong>{statusLabel}</strong> ({t("election_status.first_session").toLowerCase()})
        </span>
        {getIconForElectionStatus(status)}
      </>
    );
  } else {
    return (
      <>
        {getIconForElectionStatus(status)}
        <span>{statusLabel}</span>
      </>
    );
  }
}
