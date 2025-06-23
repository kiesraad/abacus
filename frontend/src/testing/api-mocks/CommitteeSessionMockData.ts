import { CommitteeSession } from "@/types/generated/openapi";

export const committeeSessionMockResponse: CommitteeSession = {
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
    ...committeeSessionMockResponse,
    ...committeeSession,
  };
};
