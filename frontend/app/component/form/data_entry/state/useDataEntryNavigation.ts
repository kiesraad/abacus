import { getBaseUrl, getUrlForFormSectionID } from "app/component/pollingstation/utils";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { DataEntryState } from "./types";
import { Election } from "@kiesraad/api";

export default function useDataEntryNavigation(
  state: DataEntryState,
  dispatch: React.Dispatch<any>,
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
) {
  const navigate = useNavigate();
  
    const pathname = location.pathname;
    useEffect(() => {
      if (state.targetFormSectionId) {
        const url = getUrlForFormSectionID(election.id, pollingStationId, entryNumber, state.targetFormSectionId);
        if (pathname === getBaseUrl(election.id, pollingStationId, entryNumber)) {
          void navigate(url, { replace: true });
        } else if (pathname !== url) {
          void navigate(url);
        }
        dispatch({ type: "RESET_TARGET_FORM_SECTION" });
      }
    }, [state.targetFormSectionId, navigate, election.id, pollingStationId, entryNumber, pathname]);
}
