import { Election, PollingStation, PollingStationResults } from "@kiesraad/api";

import { electionListMockResponse, getElectionMockData } from "./ElectionMockData.ts";

export interface Record {
  pollingStationId: number;
  entryNumber: number;
  data: PollingStationResults;
}

export interface ResultRecord extends Record {
  created_at: number;
}

export interface DataEntryRecord extends Record {
  progress: number;
  clientState: unknown;
  updated_at: number;
}

interface Database {
  elections: Election[];
  pollingStations: PollingStation[];
  results: ResultRecord[];
  dataEntries: DataEntryRecord[];
}

const electionMockData = electionListMockResponse.elections.map(({ id }) => getElectionMockData(id));

const initialData: Database = {
  elections: electionMockData.map((e) => e.election),
  pollingStations: electionMockData.reduce<PollingStation[]>((stations, e) => [...stations, ...e.polling_stations], []),
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
