import { useNavigate } from "react-router";

import { useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Button } from "@kiesraad/ui";

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
