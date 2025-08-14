import { useState } from "react";

import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { PollingStationRequest } from "@/types/generated/openapi";

import cls from "./PollingStationsPreview.module.css";

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
            <button id="show-more" className={cls.linkButton} onClick={showAll}>
              {t("election.polling_stations.show_all", { num: pollingStations.length })}
            </button>
          </p>
        </>
      )}
    </>
  );
}
