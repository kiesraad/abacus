import { useNavigate } from "react-router";

import { Button } from "@kiesraad/ui";

import { useElection } from "@/hooks/election/useElection";
import { t } from "@/utils/i18n/i18n";

export function AbortDataEntryControl() {
  const navigate = useNavigate();
  const { election } = useElection();

  function triggerAbortModal() {
    void navigate(`/elections/${election.id}/data-entry`);
  }

  return (
    <Button variant="secondary" size="sm" onClick={triggerAbortModal}>
      {t("data_entry.abort.action")}
    </Button>
  );
}
