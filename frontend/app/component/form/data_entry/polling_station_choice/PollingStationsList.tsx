import { PollingStation, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Badge, Table } from "@kiesraad/ui";

export interface PollingStationsListProps {
  pollingStations: PollingStation[];
}

export function PollingStationsList({ pollingStations }: PollingStationsListProps) {
  const electionStatus = useElectionStatus();

  return (
    <Table id="polling_station_list">
      <Table.Header>
        <Table.Column>{t("number")}</Table.Column>
        <Table.Column>{t("polling_station.title.singular")}</Table.Column>
      </Table.Header>
      <Table.Body>
        {pollingStations.map((pollingStation: PollingStation) => {
          const status = electionStatus.statuses.find((status) => status.id === pollingStation.id)?.status;
          if (status === "definitive") {
            return null;
          }

          return (
            <Table.LinkRow key={pollingStation.number} to={`./${pollingStation.id}`}>
              <Table.Cell number fontSizeClass="fs-body">
                {pollingStation.number}
              </Table.Cell>
              <Table.Cell fontSizeClass="fs-md">
                <span>{pollingStation.name}</span>
                {status && <Badge type={status} showIcon />}
              </Table.Cell>
            </Table.LinkRow>
          );
        })}
      </Table.Body>
    </Table>
  );
}
