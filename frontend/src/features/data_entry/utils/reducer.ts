import { Election } from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";

import { ClientState, DataEntryAction, DataEntryState } from "../types/types";
import { buildFormState, getInitialFormState, getNextSectionID, updateFormStateAfterSubmit } from "./dataEntryUtils";

export const INITIAL_FORM_SECTION_ID: FormSectionId = "recounted";

export function getInitialState(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
): DataEntryState {
  return {
    election,
    pollingStationId,
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
  // uncomment the following line to see the action in the console
  /// eslint-disable-next-line
  // console.log("ACTION", action, "OLD", state);

  switch (action.type) {
    case "DATA_ENTRY_CLAIMED":
      if (action.dataEntry.client_state) {
        const { formState, targetFormSectionId } = buildFormState(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          action.dataEntry.client_state as ClientState,
          action.dataEntry.validation_results,
          state.election,
        );
        return {
          ...state,
          formState,
          targetFormSectionId,
          pollingStationResults: action.dataEntry.data,
          error: null,
        };
      }

      return {
        ...state,
        formState: getInitialFormState(state.election),
        targetFormSectionId: INITIAL_FORM_SECTION_ID,
        pollingStationResults: action.dataEntry.data,
        error: null,
      };
    case "DATA_ENTRY_CLAIM_FAILED":
      return {
        ...state,
        error: action.error,
      };
    case "SET_STATUS":
      return {
        ...state,
        status: action.status,
        cache: action.status === "saving" && state.cache?.key === state.formState.current ? null : state.cache,
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
          current: action.formSectionId,
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
