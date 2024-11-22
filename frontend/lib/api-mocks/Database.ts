import { ClientState, Election, getInitialValues, PollingStation, PollingStationResults } from "@kiesraad/api";

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
  progress: number;
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
  results: [
    {
      pollingStationId: 4,
      entryNumber: 1,
      created_at: new Date().getTime(),
      data: getInitialValues(getElectionMockData(1).election as Required<Election>),
    },
  ],
  dataEntries: [
    {
      pollingStationId: 2,
      entryNumber: 1,
      progress: 0,
      clientState: {
        furthest: "recounted",
        current: "recounted",
        acceptedWarnings: [],
        continue: true,
      },
      updated_at: new Date().getTime(),
      data: getInitialValues(getElectionMockData(1).election as Required<Election>),
    },
    {
      pollingStationId: 3,
      entryNumber: 1,
      progress: 42,
      clientState: {
        furthest: "political_group_votes_6",
        current: "political_group_votes_6",
        acceptedWarnings: [],
        continue: true,
      },
      updated_at: new Date().getTime(),
      data: getInitialValues(getElectionMockData(1).election as Required<Election>),
    },
  ],
};

export let Database: Database = structuredClone(initialData);

export function resetDatabase(): void {
  Database = structuredClone(initialData);
}

export function pollingStationID() {
  return Database.pollingStations.length + 1;
}
