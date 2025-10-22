import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { DataEntryStatusName, PollingStation, PollingStationInvestigation } from "@/types/generated/openapi";

export interface PollingStationInvestigationWithStatus extends PollingStationInvestigation {
  pollingStation: PollingStation;
  status?: DataEntryStatusName;
}

interface InvestigationsOverview {
  investigations: PollingStationInvestigationWithStatus[];
  currentInvestigations: PollingStationInvestigationWithStatus[];
  handledInvestigations: PollingStationInvestigationWithStatus[];
  missingInvestigations: PollingStation[];
}

export default function useInvestigations(): InvestigationsOverview {
  const { currentCommitteeSession, investigations, pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  if (currentCommitteeSession.number === 1) {
    return {
      investigations: [],
      currentInvestigations: [],
      handledInvestigations: [],
      missingInvestigations: [],
    };
  }

  const investigationsWithStatus = investigations
    .map((investigation) => {
      const pollingStation = pollingStations.find((ps) => ps.id === investigation.polling_station_id);
      const status = statuses.find((s) => s.polling_station_id === investigation.polling_station_id);

      if (!pollingStation) {
        return null;
      }

      return {
        ...investigation,
        pollingStation,
        status: status ? status.status : undefined,
      };
    })
    .filter((inv) => inv !== null) satisfies PollingStationInvestigationWithStatus[];

  const currentInvestigations = investigationsWithStatus.filter(
    (inv) =>
      !inv.findings ||
      inv.corrected_results === undefined ||
      (inv.findings && inv.corrected_results && inv.status !== "definitive"),
  );
  const handledInvestigations = investigationsWithStatus.filter(
    (inv) =>
      (inv.findings && inv.corrected_results === false) ||
      (inv.findings && inv.corrected_results && inv.status === "definitive"),
  );
  const missingInvestigations = pollingStations.filter(
    (ps) => !investigations.find((inv) => inv.polling_station_id === ps.id) && !ps.id_prev_session,
  );

  return {
    investigations: investigationsWithStatus,
    currentInvestigations,
    handledInvestigations,
    missingInvestigations,
  };
}
