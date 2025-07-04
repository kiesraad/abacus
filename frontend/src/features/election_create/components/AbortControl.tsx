import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";

export function AbortControl() {
  const navigate = useNavigate();

  function triggerAbortModal() {
    void navigate(`/elections`);
  }

  return (
    <Button variant="secondary" size="sm" onClick={triggerAbortModal}>
      {t("election.abort.action")}
    </Button>
  );
}
