import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { ApiError, FatalApiError, FatalError } from "@/api/ApiResult";
import { ElectionWithPoliticalGroups } from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";

import { DataEntryContext } from "../hooks/DataEntryContext";
import useDataEntry from "../hooks/useDataEntry";
import { isStateLoaded } from "../utils/utils";

export interface DataEntryProviderProps {
  election: ElectionWithPoliticalGroups;
  pollingStationId: number;
  entryNumber: number;
  children: ReactNode;
}

export function DataEntryProvider({ election, pollingStationId, entryNumber, children }: DataEntryProviderProps) {
  const navigate = useNavigate();
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;
  const stateAndActions = useDataEntry(election, pollingStationId, entryNumber, sectionId);

  // handle non-fatal error navigation
  useEffect(() => {
    if (stateAndActions.error && stateAndActions.error instanceof ApiError) {
      switch (stateAndActions.error.reference) {
        case "DataEntryAlreadyClaimed":
          void navigate(`/elections/${election.id}/data-entry#data-entry-claimed-${pollingStationId}`);
          break;
        case "DataEntryAlreadyFinalised":
          void navigate(`/elections/${election.id}/data-entry#data-entry-finalised-${pollingStationId}`);
          break;
        case "InvalidStateTransition":
        case "DataEntryNotAllowed":
          void navigate(`/elections/${election.id}/data-entry#invalid-action-${pollingStationId}`);
          break;
      }
    }
  }, [election.id, navigate, stateAndActions.error, pollingStationId]);

  // exception for CommitteeSessionPaused error which has to trigger the rendering of a modal
  // on initial claim, navigate back to DataEntryHomePage (modal is rendered there)
  if (
    stateAndActions.error instanceof FatalApiError &&
    stateAndActions.error.reference === "CommitteeSessionPaused" &&
    !stateAndActions.pollingStationResults
  ) {
    return <Navigate to={`/elections/${election.id}/data-entry`} />;
  }

  // throw fatal errors, so the error boundary can catch them and show the full page error
  if (stateAndActions.error instanceof FatalApiError || stateAndActions.error instanceof FatalError) {
    throw stateAndActions.error;
  }

  if (!isStateLoaded(stateAndActions)) {
    return null;
  }

  return <DataEntryContext.Provider value={stateAndActions}>{children}</DataEntryContext.Provider>;
}
