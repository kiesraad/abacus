import { useNavigate } from "react-router";

import { useElection } from "@/api/election/useElection";
import { Button } from "@/components/ui/Button/Button";
import { t } from "@/lib/i18n";

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
