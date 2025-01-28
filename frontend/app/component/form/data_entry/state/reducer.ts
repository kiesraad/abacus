import { Election } from "@kiesraad/api";

import {
  buildFormState,
  getInitialFormState,
  getInitialValues,
  getNextSectionID,
  updateFormStateAfterSubmit,
} from "./dataEntryUtils";
import { ClientState, DataEntryAction, DataEntryState, FormSectionId, FormSectionReference } from "./types";

export const INITIAL_FORM_SECTION_ID: FormSectionId = "recounted";
export const INITIAL_FORM_SECTION_REFERENCE: FormSectionReference = {
  id: "recounted",
  type: "recounted",
};

export function getInitialState(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
): DataEntryState {
  return {
    election,
    pollingStationId,
    // initialData: null,
    error: null,
    pollingStationResults: null,
    entryNumber,
    formState: getInitialFormState(election),
    targetFormSectionId: INITIAL_FORM_SECTION_ID,
    status: "idle",
    cache: null,
  };
}

export default function dataEntryReducer(state: DataEntryState, action: DataEntryAction): DataEntryState {
  console.log("ACTION", action);

  switch (action.type) {
    case "DATA_ENTRY_LOADED":
      if (action.dataEntry.client_state) {
        const { formState, targetFormSectionId } = buildFormState(
          action.dataEntry.client_state as ClientState,
          action.dataEntry.validation_results,
          state.election,
        );

        return {
          ...state,
          formState,
          targetFormSectionId,
          // initialData: action.dataEntry,
          pollingStationResults: action.dataEntry.data,
          error: null,
        };
      }

      return {
        ...state,
        formState: getInitialFormState(state.election),
        targetFormSectionId: INITIAL_FORM_SECTION_ID,
        // initialData: action.dataEntry,
        pollingStationResults: action.dataEntry.data,
        error: null,
      };
    case "DATA_ENTRY_NOT_FOUND":
      return {
        ...state,
        pollingStationResults: getInitialValues(state.election),
        formState: getInitialFormState(state.election),
        targetFormSectionId: INITIAL_FORM_SECTION_ID,
      };
    case "DATA_ENTRY_LOAD_FAILED":
      return {
        ...state,
        error: action.error,
      };
    case "SET_STATUS":
      return {
        ...state,
        status: action.status,
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
            [state.formState.current]: {
              ...state.formState.sections[state.formState.current],
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
      const formState = updateFormStateAfterSubmit(
        state.formState,
        action.validationResults,
        action.continueToNextSection,
      );
      return {
        ...state,
        status: "idle",
        error: null,
        pollingStationResults: action.data,
        formState,
        targetFormSectionId: action.continueToNextSection ? getNextSectionID(formState) : state.targetFormSectionId,
      };
    }
    case "RESET_TARGET_FORM_SECTION":
      return {
        ...state,
        targetFormSectionId: null,
      };
    case "REGISTER_CURRENT_FORM":
      return {
        ...state,
        formState: {
          ...state.formState,
          current: action.form.id,
          sections: {
            ...state.formState.sections,
            ...(state.formState.sections[state.formState.current]
              ? {
                  [state.formState.current]: {
                    ...state.formState.sections[state.formState.current],
                    isSubmitted: false,
                  },
                }
              : {}),
          },
        },
      };
    default:
      console.error("Unknown action", action);
      return state;
  }
}
