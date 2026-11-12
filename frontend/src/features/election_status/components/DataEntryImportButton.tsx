import { Button } from "@/components/ui/Button/Button";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import type { CommitteeSession, Election } from "@/types/generated/openapi";

export interface DataEntryImportButtonProps {
  election: Election;
  committeeSession: CommitteeSession;
  navigate: (path: string) => void;
}

export function DataEntryImportButton({ election, committeeSession, navigate }: DataEntryImportButtonProps) {
  const { role } = useUserRole();

  if (role !== "coordinator_csb" || election.committee_category !== "CSB" || committeeSession.status === "completed") {
    return null;
  }

  return (
    <Button
      size="md"
      variant="secondary"
      onClick={() => {
        navigate(`/elections/${election.id}/data-entry/import`);
      }}
    >
      {t("data_entry_import.button_title")}
    </Button>
  );
}
