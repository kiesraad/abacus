import type { ElectionStatusResponse, ElectionStatusResponseEntry } from "@/types/generated/openapi";

const today = new Date();
today.setHours(10, 20);

export const electionStatusesMock: ElectionStatusResponseEntry[] = [
  {
    polling_station_id: 1,
    status: "empty",
  },
  {
    polling_station_id: 2,
    status: "definitive",
    first_entry_user_id: 2,
    second_entry_user_id: 1,
    first_entry_progress: 100,
    second_entry_progress: 100,
    finished_at: today.toISOString(),
    finalised_with_warnings: false,
  },
  {
    polling_station_id: 3,
    status: "entries_different",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 100,
  },
  {
    polling_station_id: 4,
    status: "second_entry_in_progress",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 20,
  },
  {
    polling_station_id: 5,
    status: "first_entry_has_errors",
    first_entry_user_id: 1,
    first_entry_progress: 100,
  },
  {
    polling_station_id: 6,
    status: "first_entry_in_progress",
    first_entry_user_id: 2,
    first_entry_progress: 60,
  },
  {
    polling_station_id: 7,
    status: "first_entry_finalised",
    first_entry_user_id: 1,
    first_entry_progress: 100,
    finished_at: today.toISOString(),
    finalised_with_warnings: false,
  },
  {
    polling_station_id: 8,
    status: "first_entry_finalised",
    first_entry_user_id: 2,
    first_entry_progress: 100,
    finished_at: today.toISOString(),
    finalised_with_warnings: true,
  },
];

export const getElectionStatusMockData = (
  status: Partial<ElectionStatusResponseEntry> = {},
): ElectionStatusResponse => {
  const updatedStatuses = [...electionStatusesMock];
  updatedStatuses[0] = {
    ...electionStatusesMock[0]!,
    ...status,
  };
  return {
    statuses: updatedStatuses,
  };
};

export const statusResponseMock: ElectionStatusResponse = getElectionStatusMockData();
