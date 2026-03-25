import type { ReactNode } from "react";

import { IconWarning } from "@/components/generated/icons";
import { Badge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar/ProgressBar";
import { Table } from "@/components/ui/Table/Table";
import { useUser } from "@/hooks/user/useUser.ts";
import { t } from "@/i18n/translate";
import type { DataEntryStatusName, ElectionStatusResponseEntry } from "@/types/generated/openapi";
import { formatDateTime } from "@/utils/dateTime";
import type { StatusCategory, StatusEntryWithTypist } from "../hooks/useElectionStatus";

interface CategoryRowProps {
  category: StatusCategory;
  statusEntryWithTypist: StatusEntryWithTypist;
  addLink: boolean;
  warning?: boolean;
}

const SHOW_BADGE: DataEntryStatusName[] = [
  "first_entry_in_progress",
  "second_entry_in_progress",
  "entries_different",
  "first_entry_has_errors",
];

function getCategoryRowUrl(entry: ElectionStatusResponseEntry): string | null {
  switch (entry.status) {
    case "empty":
      return null;
    case "entries_different":
      return `./${entry.data_entry_id}/resolve-differences`;
    default:
      return `./${entry.data_entry_id}/detail`;
  }
}

export function CategoryRow({ category, statusEntryWithTypist, addLink, warning }: CategoryRowProps): ReactNode {
  const link = getCategoryRowUrl(statusEntryWithTypist.entry);
  if (addLink && link) {
    return (
      <Table.Row to={link}>
        <CategoryRowContent category={category} statusEntryWithTypist={statusEntryWithTypist} warning={warning} />
      </Table.Row>
    );
  }

  return (
    <Table.Row>
      <CategoryRowContent category={category} statusEntryWithTypist={statusEntryWithTypist} warning={warning} />
    </Table.Row>
  );
}

interface CategoryRowContentProps {
  category: StatusCategory;
  statusEntryWithTypist: StatusEntryWithTypist;
  warning?: boolean;
}

function CategoryRowContent({ category, statusEntryWithTypist, warning }: CategoryRowContentProps): ReactNode {
  const user = useUser();

  if (!user) {
    return null;
  }

  const { entry, typist } = statusEntryWithTypist;
  const key = `${entry.source.type}-${entry.source.id}`;

  return (
    <>
      <Table.NumberCell key={`${key}-number`}>{entry.source.number}</Table.NumberCell>
      <Table.Cell key={`${key}-name`}>
        <span>{entry.source.name}</span>
        {SHOW_BADGE.includes(entry.status) && <Badge type={entry.status} userRole={user.role} />}
      </Table.Cell>
      {(category === "in_progress" || category === "first_entry_finished") && (
        <Table.Cell key={`${key}-typist`}>{typist}</Table.Cell>
      )}
      {category === "errors_and_warnings" && (
        <Table.Cell key={`${key}-to-check`}>{t(`status.${entry.status}`)}</Table.Cell>
      )}
      {category === "in_progress" && (
        <Table.Cell key={`${key}-progress`}>
          <ProgressBar
            id={`${key}-progressbar`}
            data={{
              percentage: entry.second_entry_progress ?? entry.first_entry_progress ?? 0,
              class: "default",
            }}
            showPercentage
          />
        </Table.Cell>
      )}
      {(category === "first_entry_finished" || category === "definitive") && (
        <Table.Cell key={`${key}-time`}>
          <span>{entry.finished_at ? formatDateTime(new Date(entry.finished_at)) : ""}</span>
          {warning && (
            <Icon color="warning" icon={<IconWarning aria-label={t("contains_warning")} aria-hidden="false" />} />
          )}
        </Table.Cell>
      )}
    </>
  );
}
