import { Alert } from "@/components/ui/Alert/Alert";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";

export function PollingStationAlert() {
  const { currentCommitteeSession } = useElection();

  return (
    currentCommitteeSession.status === "completed" && (
      <Alert type="warning">
        <strong className="heading-md">{t("polling_station.warning_completed.title")}</strong>
        <p>{t("polling_station.warning_completed.description")}</p>
      </Alert>
    )
  );
}
