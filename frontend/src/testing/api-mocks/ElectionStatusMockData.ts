import { ElectionStatusResponse, ElectionStatusResponseEntry } from "@/api";

export const statusResponseMock: ElectionStatusResponse = {
  statuses: [
    {
      polling_station_id: 1,
      status: "first_entry_not_started",
    },
    {
      polling_station_id: 2,
      status: "definitive",
    },
    {
      polling_station_id: 3,
      status: "entries_different",
    },
  ],
};

export const statusResponseEntriesMock: ElectionStatusResponseEntry[] = [
  {
    polling_station_id: 1,
    status: "first_entry_not_started",
  },
  {
    polling_station_id: 2,
    status: "first_entry_not_started",
  },
  {
    polling_station_id: 3,
    status: "first_entry_not_started",
  },
  {
    polling_station_id: 4,
    status: "first_entry_not_started",
  },
];
