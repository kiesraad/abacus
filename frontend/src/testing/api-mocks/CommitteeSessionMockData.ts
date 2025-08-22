import { CommitteeSession, CommitteeSessionListResponse } from "@/types/generated/openapi";

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
): CommitteeSessionListResponse => {
  return {
    committee_sessions: [
      {
        ...committeeSessionMockData,
        id: 2,
        number: 2,
        ...committeeSession,
      },
      {
        ...committeeSessionMockData,
        status: "data_entry_finished",
      },
    ],
  };
};
export const committeeSessionListMockResponse = getCommitteeSessionListMockData();
