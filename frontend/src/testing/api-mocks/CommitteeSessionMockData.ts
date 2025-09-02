import { CommitteeSession } from "@/types/generated/openapi";

export const committeeSessionMockData: CommitteeSession = {
  id: 1,
  number: 1,
  election_id: 1,
  status: "data_entry_in_progress",
  location: "",
  start_date: "",
  start_time: "",
  number_of_voters: 2000,
};

export const getCommitteeSessionMockData = (committeeSession: Partial<CommitteeSession> = {}): CommitteeSession => {
  return {
    ...committeeSessionMockData,
    ...committeeSession,
  };
};

export const getCommitteeSessionListMockData = (
  committeeSession: Partial<CommitteeSession> = {},
): CommitteeSession[] => {
  return [
    // backend returns committee sessions sorted by number, descending
    {
      ...committeeSessionMockData,
      id: 4,
      number: 4,
      ...committeeSession,
    },
    {
      ...committeeSessionMockData,
      id: 3,
      number: 3,
      status: "data_entry_finished",
    },
    {
      ...committeeSessionMockData,
      id: 2,
      number: 2,
      status: "data_entry_finished",
    },
    {
      ...committeeSessionMockData,
      status: "data_entry_finished",
    },
  ];
};
