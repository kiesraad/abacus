import { Badge } from "@/components/ui/Badge/Badge";
import { Table } from "@/components/ui/Table/Table";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";
import type { ElectionId } from "@/types/generated/openapi";
import { type DataEntryStatusWithUserStatus, getUrlForDataEntry } from "../utils/util";

export interface PollingStationsListProps {
  electionId: ElectionId;
  dataEntries: DataEntryStatusWithUserStatus[];
}

export function PollingStationsList({ electionId, dataEntries }: PollingStationsListProps) {
  const user = useUser();

  if (!user) {
    return null;
  }

  return (
    <Table id="polling_station_list">
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
        <Table.HeaderCell>{t("polling_station.title.singular")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {dataEntries.map((dataEntry) => {
          const source = dataEntry.statusEntry.source;
          return (
            <Table.Row key={source.number} to={getUrlForDataEntry(electionId, dataEntry.statusEntry)}>
              <Table.NumberCell>{source.number}</Table.NumberCell>
              <Table.Cell>
                <span>{source.name}</span>
                <Badge type={dataEntry.statusEntry.status} userRole={user.role} showIcon />
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
