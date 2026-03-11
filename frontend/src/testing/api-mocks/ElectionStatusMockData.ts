import type { ElectionStatusResponse, ElectionStatusResponseEntry } from "@/types/generated/openapi";

const today = new Date();
today.setHours(10, 20);

export const electionStatusesMock: ElectionStatusResponseEntry[] = [
  {
    source: { type: "PollingStation", id: 1, number: 33, name: "Op Rolletjes" },
    status: "empty",
  },
  {
    source: { type: "PollingStation", id: 2, number: 34, name: "Testplek" },
    status: "definitive",
    first_entry_user_id: 2,
    second_entry_user_id: 1,
    first_entry_progress: 100,
    second_entry_progress: 100,
    finished_at: today.toISOString(),
    finalised_with_warnings: false,
  },
  {
    source: { type: "PollingStation", id: 3, number: 35, name: "Testschool" },
    status: "entries_different",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 100,
  },
  {
    source: { type: "PollingStation", id: 4, number: 36, name: "Testbuurthuis" },
    status: "second_entry_in_progress",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 20,
  },
  {
    source: { type: "PollingStation", id: 5, number: 37, name: "Dansschool Oeps nou deed ik het weer" },
    status: "first_entry_has_errors",
    first_entry_user_id: 1,
    first_entry_progress: 100,
  },
  {
    source: { type: "PollingStation", id: 6, number: 38, name: "Testmuseum" },
    status: "first_entry_in_progress",
    first_entry_user_id: 2,
    first_entry_progress: 60,
  },
  {
    source: { type: "PollingStation", id: 7, number: 39, name: "Test gemeentehuis" },
    status: "first_entry_finalised",
    first_entry_user_id: 1,
    first_entry_progress: 100,
    finished_at: today.toISOString(),
    finalised_with_warnings: false,
  },
  {
    source: { type: "PollingStation", id: 8, number: 40, name: "Test kerk" },
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
