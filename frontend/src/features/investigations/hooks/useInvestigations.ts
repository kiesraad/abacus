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
}

export default function useInvestigations(): InvestigationsOverview {
  const { investigations, pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  if (investigations.length === 0) {
    return {
      investigations: [],
      currentInvestigations: [],
      handledInvestigations: [],
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
        pollingStation: pollingStation,
        status: status ? status.status : undefined,
      };
    })
    .filter((inv) => inv !== null) as PollingStationInvestigationWithStatus[];

  const currentInvestigations = investigationsWithStatus.filter(
    (inv) => !inv.findings || (inv.findings && inv.corrected_results && inv.status !== "definitive"),
  );
  const handledInvestigations = investigationsWithStatus.filter(
    (inv) =>
      (inv.findings && !inv.corrected_results) ||
      (inv.findings && inv.corrected_results && inv.status === "definitive"),
  );

  return {
    investigations: investigationsWithStatus,
    currentInvestigations,
    handledInvestigations,
  };
}
