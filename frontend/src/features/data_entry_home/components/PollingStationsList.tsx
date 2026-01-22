import { Badge } from "@/components/ui/Badge/Badge";
import { Table } from "@/components/ui/Table/Table";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";

import { getUrlForDataEntry, type PollingStationWithStatus } from "../utils/util";

export interface PollingStationsListProps {
  pollingStations: PollingStationWithStatus[];
}

export function PollingStationsList({ pollingStations }: PollingStationsListProps) {
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
        {pollingStations.map(
          (pollingStation) =>
            pollingStation.statusEntry && (
              <Table.Row
                key={pollingStation.number}
                to={getUrlForDataEntry(
                  pollingStation.election_id,
                  pollingStation.id,
                  pollingStation.statusEntry.status,
                )}
              >
                <Table.NumberCell>{pollingStation.number}</Table.NumberCell>
                <Table.Cell>
                  <span>{pollingStation.name}</span>
                  <Badge type={pollingStation.statusEntry.status} userRole={user.role} showIcon />
                </Table.Cell>
              </Table.Row>
            ),
        )}
      </Table.Body>
    </Table>
  );
}
