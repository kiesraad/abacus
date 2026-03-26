import { Alert } from "@/components/ui/Alert/Alert";
import { DataEntryLink } from "@/features/data_entry_home/components/DataEntryLink";
import type { DataEntryStatusWithUserStatus } from "@/features/data_entry_home/utils/util";
import { t } from "@/i18n/translate";
import type { ElectionId } from "@/types/generated/openapi";

interface UnfinishedEntriesListProps {
  electionId: ElectionId;
  dataEntries: DataEntryStatusWithUserStatus[];
}

export function UnfinishedEntriesList({ electionId, dataEntries }: UnfinishedEntriesListProps) {
  return (
    dataEntries.length > 0 && (
      <div className="mb-lg" id="unfinished-list">
        <Alert type="notify" variant="no-icon">
          <strong className="heading-md">{t("data_entry_home.unfinished_input_title")}</strong>
          <p>{t("data_entry_home.unfinished_input_content")}</p>
          {dataEntries.map(({ statusEntry }) => (
            <DataEntryLink key={statusEntry.data_entry_id} electionId={electionId} dataEntry={statusEntry} />
          ))}
        </Alert>
      </div>
    )
  );
}
