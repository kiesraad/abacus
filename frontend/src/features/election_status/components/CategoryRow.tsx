import { ReactNode } from "react";

import { IconWarning } from "@/components/generated/icons";
import { Badge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar/ProgressBar";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { DataEntryStatusName } from "@/types/generated/openapi";
import { formatDateTime } from "@/utils/dateTime";

import { PollingStationWithStatusAndTypist, StatusCategory } from "../hooks/useElectionStatus";

interface CategoryRowProps {
  category: StatusCategory;
  pollingStation: PollingStationWithStatusAndTypist;
  addLink: boolean;
  warning?: boolean;
}

const SHOW_BADGE: DataEntryStatusName[] = [
  "first_entry_in_progress",
  "second_entry_in_progress",
  "entries_different",
  "first_entry_has_errors",
];

function getCategoryRowUrl(
  pollingStationStatus: DataEntryStatusName | undefined,
  pollingStationId: number,
): string | null {
  switch (pollingStationStatus) {
    case "first_entry_not_started":
      return null;
    case "entries_different":
      return `./${pollingStationId}/resolve-differences`;
    default:
      return `./${pollingStationId}/detail`;
  }
}

export function CategoryRow({ category, pollingStation, addLink, warning }: CategoryRowProps): ReactNode {
  const link = getCategoryRowUrl(pollingStation.status, pollingStation.id);
  if (addLink && link) {
    return (
      <Table.Row to={link}>
        <CategoryRowContent category={category} pollingStation={pollingStation} warning={warning} />
      </Table.Row>
    );
  }

  return (
    <Table.Row>
      <CategoryRowContent category={category} pollingStation={pollingStation} warning={warning} />
    </Table.Row>
  );
}

interface CategoryRowContentProps {
  category: StatusCategory;
  pollingStation: PollingStationWithStatusAndTypist;
  warning?: boolean;
}

function CategoryRowContent({ category, pollingStation, warning }: CategoryRowContentProps): ReactNode {
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
          <span>{pollingStation.finished_at ? formatDateTime(new Date(pollingStation.finished_at)) : ""}</span>
          {warning && <Icon color="warning" icon={<IconWarning aria-label={t("contains_warning")} />} />}
        </Table.Cell>
      )}
    </>
  );
}
