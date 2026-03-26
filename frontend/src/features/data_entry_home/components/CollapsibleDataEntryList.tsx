import { Alert } from "@/components/ui/Alert/Alert";
import { DataEntryList } from "@/features/data_entry_home/components/DataEntryList";
import type { DataEntryStatusWithUserStatus } from "@/features/data_entry_home/utils/util";
import { t } from "@/i18n/translate";
import type { ElectionId } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import cls from "./DataEntryHome.module.css";

interface CollapsibleDataEntryListProps {
  electionId: ElectionId;
  availableDataEntries: DataEntryStatusWithUserStatus[];
  onToggle: () => void;
}

export function CollapsibleDataEntryList({
  electionId,
  availableDataEntries,
  onToggle,
}: CollapsibleDataEntryListProps) {
  return (
    <div className={cls.dataEntryList}>
      <details onToggle={onToggle}>
        <summary>
          {t("data_entry_home.unknown_number")}
          <br />
          <span id="openList" className={cn("underlined", cls.pointer)}>
            {t("data_entry_home.view_list")}
          </span>
        </summary>
        <h3 className="mb-lg">{t("data_entry_home.choose_polling_station")}</h3>
        {availableDataEntries.length === 0 ? (
          <Alert type="notify" small>
            <p>{t("data_entry_home.there_are_no_polling_stations_left_to_fill_in")}</p>
          </Alert>
        ) : (
          <DataEntryList electionId={electionId} dataEntries={availableDataEntries} />
        )}
      </details>
    </div>
  );
}
