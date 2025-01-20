import { Election } from "@kiesraad/api";

import { buildFormState, getInitialFormState, getInitialValues, getNextSectionID } from "./dataEntryUtils";
import { ClientState, DataEntryAction, DataEntryState, FormSectionId, FormSectionReference } from "./types";

export const INITIAL_FORM_SECTION_ID: FormSectionId = "recounted";
export const INITIAL_FORM_SECTION_REFERENCE: FormSectionReference = {
  id: "recounted",
  type: "recounted",
};

export function getInitialState(election: Required<Election>): DataEntryState {
  return {
    election,
    initialData: null,
    error: null,
    pollingStationResults: null,
    formState: getInitialFormState(election),
    targetFormSectionId: INITIAL_FORM_SECTION_ID,
    status: "idle",
    currentForm: INITIAL_FORM_SECTION_REFERENCE,
    temporaryCache: null,
  };
}

export default function dataEntryReducer(state: DataEntryState, action: DataEntryAction): DataEntryState {
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
          initialData: action.dataEntry,
          pollingStationResults: action.dataEntry.data,
          error: null,
        };
      }

      return {
        ...state,
        formState: getInitialFormState(state.election),
        targetFormSectionId: INITIAL_FORM_SECTION_ID,
        initialData: action.dataEntry,
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
    case "SET_FORM_STATUS":
      return {
        ...state,
        status: action.status,
      };
    case "FORM_SAVE_FAILED":
      return {
        ...state,
        status: "idle",
        error: action.error,
      };
    case "FORM_SAVED":
      return {
        ...state,
        status: "idle",
        error: null,
        formState: action.formState,
        targetFormSectionId: action.continueToNextSection
          ? getNextSectionID(action.formState)
          : state.targetFormSectionId,
      };
    case "REGISTER_CURRENT_FORM":
      if (state.currentForm !== null && action.form.id !== state.currentForm.id) {
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
          currentForm: action.form,
        };
      }

      return {
        ...state,
        currentForm: action.form,
      };
    default:
      console.error("Unknown action", action);
      return state;
  }
}
