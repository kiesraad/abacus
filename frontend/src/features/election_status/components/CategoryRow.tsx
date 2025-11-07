import { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar/ProgressBar";
import { Table } from "@/components/ui/Table/Table";
import { getCategoryRowUrl } from "@/features/election_status/utils/utils";
import { t } from "@/i18n/translate";
import { DataEntryStatusName } from "@/types/generated/openapi";
import { formatDateTime } from "@/utils/dateTime";

import { PollingStationWithStatusAndTypist, StatusCategory } from "../hooks/useElectionStatus";

interface CategoryRowProps {
  category: StatusCategory;
  pollingStation: PollingStationWithStatusAndTypist;
  addLink: boolean;
}

const SHOW_BADGE: DataEntryStatusName[] = [
  "first_entry_in_progress",
  "second_entry_in_progress",
  "entries_different",
  "first_entry_has_errors",
];

export function CategoryRow({ category, pollingStation, addLink }: CategoryRowProps): ReactNode {
  const link = getCategoryRowUrl(pollingStation.status, pollingStation.id);
  if (addLink && link) {
    return (
      <Table.LinkRow to={link}>
        <CategoryRowContent category={category} pollingStation={pollingStation} />
      </Table.LinkRow>
    );
  }

  return (
    <Table.Row>
      <CategoryRowContent category={category} pollingStation={pollingStation} />
    </Table.Row>
  );
}

interface CategoryRowContentProps {
  category: StatusCategory;
  pollingStation: PollingStationWithStatusAndTypist;
}

function CategoryRowContent({ category, pollingStation }: CategoryRowContentProps): ReactNode {
  return (
    <>
      <Table.NumberCell key={`${pollingStation.id}-number`}>{pollingStation.number}</Table.NumberCell>
      <Table.Cell key={`${pollingStation.id}-name`}>
        <span>{pollingStation.name}</span>
        {pollingStation.status && SHOW_BADGE.includes(pollingStation.status) && <Badge type={pollingStation.status} />}
      </Table.Cell>
      {(category === "in_progress" || category === "first_entry_finished") && (
        <Table.Cell key={`${pollingStation.id}-typist`}>{pollingStation.typist}</Table.Cell>
      )}
      {category === "errors_and_warnings" && pollingStation.status !== undefined && (
        <Table.Cell key={`${pollingStation.id}-to-check`}>{t(`status.${pollingStation.status}`)}</Table.Cell>
      )}
      {category === "in_progress" && (
        <Table.Cell key={`${pollingStation.id}-progress`}>
          <ProgressBar
            id={`${pollingStation.id}-progressbar`}
            data={{
              percentage: pollingStation.second_entry_progress ?? pollingStation.first_entry_progress ?? 0,
              class: "default",
            }}
            showPercentage
          />
        </Table.Cell>
      )}
      {(category === "first_entry_finished" || category === "definitive") && (
        <Table.Cell key={`${pollingStation.id}-time`}>
          {pollingStation.finished_at ? formatDateTime(new Date(pollingStation.finished_at)) : ""}
        </Table.Cell>
      )}
    </>
  );
}
