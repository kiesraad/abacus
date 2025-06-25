import { CommitteeSession, CommitteeSessionListResponse } from "@/types/generated/openapi";

export const committeeSessionMockData: CommitteeSession = {
  id: 1,
  number: 1,
  election_id: 1,
  status: "data_entry_in_progress",
  location: "",
  start_date: "",
  start_time: "",
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
        status: "data_entry_finished",
      },
      {
        ...committeeSessionMockData,
        id: 2,
        number: 2,
        ...committeeSession,
      },
    ],
  };
};
export const committeeSessionListMockResponse = getCommitteeSessionListMockData();
