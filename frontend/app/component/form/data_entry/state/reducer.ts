import { Election } from "@kiesraad/api";

import { ClientState, INITIAL_FORM_SECTION_ID } from "../PollingStationFormController";
import { buildFormState, getInitialFormState, getInitialValues } from "../pollingStationUtils";
import { DataEntryAction, DataEntryState } from "./types";

export function getInitialState(election: Required<Election>): DataEntryState {
  return {
    election,
    initialData: null,
    error: null,
    pollingStationResults: null,
    formState: getInitialFormState(election),
    targetFormSectionID: null,
    status: "idle",
    currentForm: null,
    temporaryCache: null,
  };
}

export default function dataEntryReducer(state: DataEntryState, action: DataEntryAction): DataEntryState {
  switch (action.type) {
    case "DATA_ENTRY_LOADED":
      if (action.dataEntry.client_state) {
        const { formState, targetFormSectionID } = buildFormState(
          action.dataEntry.client_state as ClientState,
          action.dataEntry.validation_results,
          state.election,
        );

        return {
          ...state,
          formState,
          targetFormSectionID,
          initialData: action.dataEntry,
          pollingStationResults: action.dataEntry.data,
          error: null,
        };
      }

      return {
        ...state,
        formState: getInitialFormState(state.election),
        targetFormSectionID: INITIAL_FORM_SECTION_ID,
        initialData: action.dataEntry,
        pollingStationResults: action.dataEntry.data,
        error: null,
      };
    case "DATA_ENTRY_NOT_FOUND":
      return {
        ...state,
        pollingStationResults: getInitialValues(state.election),
        formState: getInitialFormState(state.election),
        targetFormSectionID: INITIAL_FORM_SECTION_ID,
      };
    case "DATA_ENTRY_LOAD_FAILED":
      return {
        ...state,
        error: action.error,
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
