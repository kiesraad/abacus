import { Badge, Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { getUrlForDataEntry } from "@/lib/util";

import { PollingStationWithStatus } from "../utils/util";

export interface PollingStationsListProps {
  pollingStations: PollingStationWithStatus[];
}

export function PollingStationsList({ pollingStations }: PollingStationsListProps) {
  return (
    <Table id="polling_station_list">
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
        <Table.HeaderCell>{t("polling_station.title.singular")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {pollingStations.map((pollingStation) => {
          return (
            <Table.LinkRow
              key={pollingStation.number}
              to={getUrlForDataEntry(pollingStation.election_id, pollingStation.id, pollingStation.statusEntry?.status)}
            >
              <Table.NumberCell>{pollingStation.number}</Table.NumberCell>
              <Table.Cell>
                <span>{pollingStation.name}</span>
                {pollingStation.statusEntry && <Badge type={pollingStation.statusEntry.status} showIcon />}
              </Table.Cell>
            </Table.LinkRow>
          );
        })}
      </Table.Body>
    </Table>
  );
}
