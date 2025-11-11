import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { ApiError, FatalApiError, NotFoundError } from "@/api/ApiResult";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import { ElectionWithPoliticalGroups, PollingStation } from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";

import { DataEntryContext } from "../hooks/DataEntryContext";
import useDataEntry from "../hooks/useDataEntry";
import { redirectToHomePageErrorReferences } from "../utils/errors";
import { isStateLoaded } from "../utils/utils";

export interface DataEntryProviderProps {
  election: ElectionWithPoliticalGroups;
  pollingStation: PollingStation;
  entryNumber: number;
  children: ReactNode;
}

export function DataEntryProvider({ election, pollingStation, entryNumber, children }: DataEntryProviderProps) {
  const navigate = useNavigate();
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;
  const stateAndActions = useDataEntry(election, pollingStation.id, entryNumber, sectionId);
  const { pushMessage } = useMessages();

  // handle non-fatal error navigation
  useEffect(() => {
    if (
      stateAndActions.error instanceof ApiError &&
      redirectToHomePageErrorReferences.includes(stateAndActions.error.reference)
    ) {
      pushMessage({
        type: "warning",
        title: t("data_entry.data_entry_not_possible", { nr: pollingStation.number }),
        text: t(`error.api_error.${stateAndActions.error.reference}`),
      });
      void navigate(`/elections/${election.id}/data-entry`);
    }
  }, [election.id, navigate, pushMessage, stateAndActions.error, pollingStation.number]);

  // throw fatal errors, so the error boundary can catch them and show the full page error
  if (stateAndActions.error instanceof FatalApiError) {
    // exception for CommitteeSessionPaused error which has to trigger the rendering of a modal
    if (stateAndActions.error.reference === "CommitteeSessionPaused") {
      // on initial claim, navigate back to DataEntryHomePage (modal is rendered there)
      if (!stateAndActions.pollingStationResults) {
        return <Navigate to={`/elections/${election.id}/data-entry`} />;
      }
    } else {
      throw stateAndActions.error;
    }
  }

  if (stateAndActions.error instanceof NotFoundError) {
    throw stateAndActions.error;
  }

  if (!isStateLoaded(stateAndActions)) {
    // if sectionId is set the corresponsing section will render an error modal if needed
    // otherwise we have to throw the error here to show the full page error
    // this is the case when the data entry claim failed initially
    if (!sectionId && stateAndActions.error) {
      throw stateAndActions.error;
    }

    return null;
  }

  return <DataEntryContext.Provider value={stateAndActions}>{children}</DataEntryContext.Provider>;
}
