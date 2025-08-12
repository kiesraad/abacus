import { useState } from "react";

import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { PollingStationRequest } from "@/types/generated/openapi";

export interface PollingStationsPreviewProps {
  pollingStations: PollingStationRequest[];
}

export function PollingStationsPreview({ pollingStations }: PollingStationsPreviewProps) {
  const [showAllPollingPlaces, setShowAllPollingPlaces] = useState<boolean>(false);

  function showAll() {
    setShowAllPollingPlaces(true);
  }

  return (
    <>
      {(showAllPollingPlaces || pollingStations.length <= 10) && (
        <Table className={"table"} id="overview">
          <Table.Body>
            {pollingStations.map((pollingStation: PollingStationRequest) => (
              <Table.Row key={pollingStation.number}>
                <Table.NumberCell className="bold">{pollingStation.number}</Table.NumberCell>
                <Table.Cell>{pollingStation.name}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {!showAllPollingPlaces && pollingStations.length > 10 && (
        <>
          <Table className={"table"} id="overview">
            <Table.Body>
              {pollingStations.slice(0, 10).map((pollingStation: PollingStationRequest) => (
                <Table.Row key={pollingStation.number}>
                  <Table.NumberCell className="bold">{pollingStation.number}</Table.NumberCell>
                  <Table.Cell>{pollingStation.name}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <p className="mt-lg">
            <LinkButton
              id="show-more"
              onClick={showAll}
              text={t("election.polling_stations.show_all", { num: pollingStations.length })}
            />
          </p>
        </>
      )}
    </>
  );
}
