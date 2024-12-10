import { PollingStation, useElectionStatus } from "@kiesraad/api";
import { Badge, Table } from "@kiesraad/ui";
import { getUrlForDataEntry } from "@kiesraad/util";

export interface PollingStationsListProps {
  pollingStations: PollingStation[];
}

export function PollingStationsList({ pollingStations }: PollingStationsListProps) {
  const electionStatus = useElectionStatus();

  return (
    <Table id="polling_station_list">
      <Table.Header>
        <Table.Column>Nummer</Table.Column>
        <Table.Column>Stembureau</Table.Column>
      </Table.Header>
      <Table.Body>
        {pollingStations.map((pollingStation: PollingStation) => {
          const status = electionStatus.statuses.find((status) => status.id === pollingStation.id)?.status;
          if (status === "definitive") {
            return null;
          }

          return (
            <Table.LinkRow
              key={pollingStation.number}
              to={getUrlForDataEntry(pollingStation.election_id, pollingStation.id, status)}
            >
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
