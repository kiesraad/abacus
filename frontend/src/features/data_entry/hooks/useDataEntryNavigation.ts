import { useEffect } from "react";
import { useNavigate } from "react-router";

import type { ElectionWithPoliticalGroups } from "@/types/generated/openapi";
import type { FormSectionId } from "@/types/types";

import type { DataEntryDispatch, DataEntryState } from "../types/types";
import { getBaseUrl, getUrlForFormSectionID } from "../utils/utils";

export default function useDataEntryNavigation(
  state: DataEntryState,
  dispatch: DataEntryDispatch,
  election: ElectionWithPoliticalGroups,
  pollingStationId: number,
  entryNumber: number,
  sectionId: FormSectionId | null,
) {
  const navigate = useNavigate();

  // navigate to the target form section
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
  }, [dispatch, state.targetFormSectionId, navigate, election.id, pollingStationId, entryNumber, pathname]);

  // prevent navigating to sections that are not yet active
  useEffect(() => {
    const currentSection = sectionId ? state.formState?.sections[sectionId] : null;
    const furthestSection = state.formState?.sections[state.formState.furthest];
    if (currentSection && furthestSection) {
      if (currentSection.index > furthestSection.index) {
        const url = getUrlForFormSectionID(election.id, pollingStationId, entryNumber, furthestSection.id);
        void navigate(url);
      }
    }
  }, [sectionId, state.formState, navigate, election.id, pollingStationId, entryNumber]);
}
