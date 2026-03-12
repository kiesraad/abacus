import type { ElectionStatusResponse, ElectionStatusResponseEntry } from "@/types/generated/openapi";

const today = new Date();
today.setHours(10, 20);

export const electionStatusesMock: ElectionStatusResponseEntry[] = [
  {
    data_entry_id: 1,
    source: { type: "PollingStation", id: 1, number: 33, name: "Op Rolletjes" },
    status: "empty",
  },
  {
    data_entry_id: 2,
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
    data_entry_id: 3,
    source: { type: "PollingStation", id: 3, number: 35, name: "Testschool" },
    status: "entries_different",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 100,
  },
  {
    data_entry_id: 4,
    source: { type: "PollingStation", id: 4, number: 36, name: "Testbuurthuis" },
    status: "second_entry_in_progress",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 20,
  },
  {
    data_entry_id: 5,
    source: { type: "PollingStation", id: 5, number: 37, name: "Dansschool Oeps nou deed ik het weer" },
    status: "first_entry_has_errors",
    first_entry_user_id: 1,
    first_entry_progress: 100,
  },
  {
    data_entry_id: 6,
    source: { type: "PollingStation", id: 6, number: 38, name: "Testmuseum" },
    status: "first_entry_in_progress",
    first_entry_user_id: 2,
    first_entry_progress: 60,
  },
  {
    data_entry_id: 7,
    source: { type: "PollingStation", id: 7, number: 39, name: "Test gemeentehuis" },
    status: "first_entry_finalised",
    first_entry_user_id: 1,
    first_entry_progress: 100,
    finished_at: today.toISOString(),
    finalised_with_warnings: false,
  },
  {
    data_entry_id: 8,
    source: { type: "PollingStation", id: 8, number: 40, name: "Test kerk" },
    status: "first_entry_finalised",
    first_entry_user_id: 2,
    first_entry_progress: 100,
    finished_at: today.toISOString(),
    finalised_with_warnings: true,
  },
];

/**
 * Return an ElectionStatusResponse with the given status supplemented with data_entry_id, source
 * @param statuses rest param with ElectionStatusResponseEntry objects where only the status is mandatory
 */
export const getElectionStatusMockData = (
  statuses: (Partial<ElectionStatusResponseEntry> & { status: ElectionStatusResponseEntry["status"] })[],
): ElectionStatusResponse => ({
  statuses: statuses.map((status, i) => {
    const { data_entry_id, source } = electionStatusesMock[i]!;
    return {
      data_entry_id,
      source,
      ...status,
    };
  }),
});

export const statusResponseMock: ElectionStatusResponse = {
  statuses: electionStatusesMock,
};
