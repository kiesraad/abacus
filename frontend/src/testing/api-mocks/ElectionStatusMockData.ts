import { ElectionStatusResponse } from "@/types/generated/openapi";

const today = new Date();
today.setHours(10, 20);

export const statusResponseMock: ElectionStatusResponse = {
  statuses: [
    {
      polling_station_id: 1,
      status: "first_entry_not_started",
    },
    {
      polling_station_id: 2,
      status: "definitive",
      first_entry_user_id: 2,
      second_entry_user_id: 1,
      finished_at: today.toISOString(),
    },
    {
      polling_station_id: 3,
      status: "entries_different",
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
      // TODO: will this break other tests?
      polling_station_id: 6,
      status: "first_entry_in_progress",
      first_entry_user_id: 2,
      first_entry_progress: 50,
    },
  ],
};
