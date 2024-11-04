import { ClientState, Election, PollingStation, PollingStationResults } from "@kiesraad/api";

import { getElectionMockData } from "./ElectionMockData.ts";

export interface ResultRecord {
  pollingStationId: number;
  entryNumber: number;
  data: PollingStationResults;
  timestamp: number;
}

export interface DataEntryRecord extends ResultRecord {
  clientState: ClientState;
}

interface Database {
  elections: Election[];
  pollingStations: PollingStation[];
  results: ResultRecord[];
  dataEntries: DataEntryRecord[];
}

const initialData: Database = {
  elections: [getElectionMockData(1).election, getElectionMockData(2).election, getElectionMockData(3).election],
  pollingStations: [
    ...getElectionMockData(1).polling_stations,
    ...getElectionMockData(2).polling_stations,
    ...getElectionMockData(3).polling_stations,
  ],
  results: [],
  dataEntries: [],
};

export let Database: Database = structuredClone(initialData);

export function resetDatabase(): void {
  Database = structuredClone(initialData);
}
