import { useNavigate } from "react-router-dom";

import { PollingStation } from "@kiesraad/api";
import { IconChevronRight } from "@kiesraad/icon";

export interface PollingStationsListProps {
  pollingStations: PollingStation[];
}

export function PollingStationsList({ pollingStations }: PollingStationsListProps) {
  const navigate = useNavigate();

  const handleRowClick = (pollingStationNumber: number) => () => {
    navigate(`./${pollingStationNumber}/recounted`);
  };

  return (
    <table id="polling_station_list" className="overview_table">
      <thead>
        <tr>
          <th className="align-center">Nummer</th>
          <th>Stembureau</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {pollingStations.map((pollingStation: PollingStation) => (
          <tr onClick={handleRowClick(pollingStation.number)} key={pollingStation.number}>
            <td width="6.5rem" className="number">
              {pollingStation.number}
            </td>
            <td>
              <span>{pollingStation.name}</span>
              {/* TODO: <Badge type="first_entry" />*/}
            </td>
            <td width="5rem">
              <div className="link">
                <IconChevronRight />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
