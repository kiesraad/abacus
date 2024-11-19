import { ClientState, Election, PollingStation, PollingStationResults } from "@kiesraad/api";

import { getElectionMockData } from "./ElectionMockData.ts";

export interface Record {
  pollingStationId: number;
  entryNumber: number;
  data: PollingStationResults;
}

export interface ResultRecord extends Record {
  created_at: number;
}

export interface DataEntryRecord extends Record {
  clientState: ClientState;
  updated_at: number;
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

export function pollingStationID() {
  return Database.pollingStations.length + 1;
}
