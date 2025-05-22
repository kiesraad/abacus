import { ReactNode } from "react";

import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";

import { StatusCategory } from "../hooks/useElectionStatus";

interface CategoryHeaderProps {
  category: StatusCategory;
}

export function CategoryHeader({ category }: CategoryHeaderProps): ReactNode {
  return (
    <Table.Header className="bg-gray">
      <Table.HeaderCell key={`${category}-number`} className="text-align-r">
        {t("number")}
      </Table.HeaderCell>
      <Table.HeaderCell key={`${category}-name`}>{t("polling_station.title.singular")}</Table.HeaderCell>
      {(category === "in_progress" || category === "first_entry_finished") && (
        <Table.HeaderCell key={`${category}-typist`} className="w-14">
          {t("typist")}
        </Table.HeaderCell>
      )}
      {category === "in_progress" && (
        <Table.HeaderCell key={`${category}-progress`} className="w-14">
          {t("progress")}
        </Table.HeaderCell>
      )}
      {(category === "first_entry_finished" || category === "definitive") && (
        <Table.HeaderCell key={`${category}-time`} className="w-14">
          {t("finished_at")}
        </Table.HeaderCell>
      )}
    </Table.Header>
  );
}
