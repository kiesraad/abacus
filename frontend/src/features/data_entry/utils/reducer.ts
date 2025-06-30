import { ElectionWithPoliticalGroups } from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { ClientState, DataEntryAction, DataEntryState } from "../types/types";
import { buildFormState, getInitialFormState, getNextSectionID, updateFormStateAfterSubmit } from "./dataEntryUtils";

export const INITIAL_FORM_SECTION_ID: FormSectionId = "recounted";

export function getInitialState(
  election: ElectionWithPoliticalGroups,
  pollingStationId: number,
  entryNumber: number,
): DataEntryState {
  const dataEntryStructure = getDataEntryStructure(election);
  return {
    election,
    pollingStationId,
    error: null,
    pollingStationResults: null,
    entryNumber,
    dataEntryStructure,
    formState: getInitialFormState(dataEntryStructure),
    targetFormSectionId: null,
    status: "idle",
    cache: null,
  };
}

export default function dataEntryReducer(state: DataEntryState, action: DataEntryAction): DataEntryState {
  // uncomment the following line to see the action in the console
  /// eslint-disable-next-line
  //console.log("ACTION", action, "OLD", state);

  switch (action.type) {
    case "DATA_ENTRY_CLAIMED": {
      const dataEntryStructure = getDataEntryStructure(state.election, action.dataEntry.data);
      if (action.dataEntry.client_state) {
        const { formState, targetFormSectionId } = buildFormState(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          action.dataEntry.client_state as ClientState,
          action.dataEntry.validation_results,
          dataEntryStructure,
        );
        return {
          ...state,
          dataEntryStructure,
          formState,
          targetFormSectionId,
          pollingStationResults: action.dataEntry.data,
          error: null,
        };
      } else {
        return {
          ...state,
          dataEntryStructure,
          formState: getInitialFormState(state.dataEntryStructure),
          targetFormSectionId: INITIAL_FORM_SECTION_ID,
          pollingStationResults: action.dataEntry.data,
          error: null,
        };
      }
    }
    case "DATA_ENTRY_CLAIM_FAILED":
      return {
        ...state,
        error: action.error,
      };
    case "SET_STATUS":
      return {
        ...state,
        status: action.status,
        cache:
          action.status === "saving" && action.sectionId && state.cache?.key === action.sectionId ? null : state.cache,
      };
    case "SET_CACHE":
      return {
        ...state,
        cache: action.cache,
      };
    case "UPDATE_FORM_SECTION":
      return {
        ...state,
        formState: {
          ...state.formState,
          sections: {
            ...state.formState.sections,
            [action.sectionId]: {
              ...state.formState.sections[action.sectionId],
              ...action.partialFormSection,
            },
          },
        },
      };
    case "FORM_SAVE_FAILED":
      return {
        ...state,
        status: "idle",
        error: action.error,
      };
    case "FORM_SAVED": {
      const dataEntryStructure = getDataEntryStructure(state.election, action.data);

      const formState = updateFormStateAfterSubmit(
        dataEntryStructure,
        state.formState,
        action.validationResults,
        action.sectionId,
        action.continueToNextSection,
      );

      return {
        ...state,
        status: "idle",
        error: null,
        pollingStationResults: action.data,
        dataEntryStructure,
        formState,
        targetFormSectionId: action.continueToNextSection
          ? getNextSectionID(formState, action.sectionId)
          : state.targetFormSectionId,
      };
    }
    case "RESET_TARGET_FORM_SECTION":
      return {
        ...state,
        targetFormSectionId: null,
      };
    default:
      console.error("Unknown action", action);
      return state;
  }
}
