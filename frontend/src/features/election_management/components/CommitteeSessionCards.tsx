import { useCommitteeSessionList } from "@/hooks/committee_session/useCommitteeSessionList";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

export function CommitteeSessionCards() {
  const { committeeSessions } = useCommitteeSessionList();

  return (
    <>
      {committeeSessions.map((committeeSession, index) => (
        <CommitteeSessionCard
          key={committeeSession.id}
          committeeSession={committeeSession}
          currentSession={index === 0}
        />
      ))}
    </>
  );
}
