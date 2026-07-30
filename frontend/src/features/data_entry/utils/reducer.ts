import { assertStateIsLoaded } from "@/features/data_entry/utils/utils";
import type { DataEntryId, ElectionWithPoliticalGroups } from "@/types/generated/openapi";
import type { FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import type { ClientState, DataEntryAction, DataEntryState, EntryNumber, FormState } from "../types/types";
import {
  addCorrectionWarnings,
  buildCorrectionFormState,
  buildFormState,
  getInitialFormState,
  getNextSectionID,
  resetFieldValues,
  updateFormStateAfterSubmit,
} from "./dataEntryUtils";

export function getInitialState(
  election: ElectionWithPoliticalGroups,
  dataEntryId: DataEntryId,
  entryNumber: EntryNumber,
): DataEntryState {
  return {
    election,
    dataEntryId,
    error: null,
    previousResults: null,
    results: null,
    source: null,
    dataEntryStatus: null,
    entryNumber,
    dataEntryStructure: null,
    formState: null,
    targetFormSectionId: null,
    status: "idle",
    cache: null,
  };
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export default function dataEntryReducer(state: DataEntryState, action: DataEntryAction): DataEntryState {
  switch (action.type) {
    case "DATA_ENTRY_CLAIMED": {
      const model = action.dataEntry.data.model;
      const dataEntryStructure = getDataEntryStructure(model, state.election);

      let formState: FormState;
      let targetFormSectionId: FormSectionId | undefined;
      const results = action.dataEntry.data;

      if (action.dataEntry.client_state) {
        ({ formState, targetFormSectionId } = buildFormState(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          action.dataEntry.client_state as ClientState,
          action.dataEntry.validation_results,
          dataEntryStructure,
        ));
      } else if (action.dataEntry.is_correction) {
        // an entry that was returned for correction and has no client state left to restore
        ({ formState, targetFormSectionId } = buildCorrectionFormState(
          action.dataEntry.validation_results,
          dataEntryStructure,
        ));

        if (action.dataEntry.correction_warnings) {
          addCorrectionWarnings(dataEntryStructure, action.dataEntry.correction_warnings, formState);
          resetFieldValues(dataEntryStructure, action.dataEntry.correction_warnings, results);
        }
      } else {
        formState = getInitialFormState(dataEntryStructure);
        targetFormSectionId = dataEntryStructure[0]?.id;
      }
      if (targetFormSectionId === undefined) {
        throw new Error("Cannot determine initial section from dataEntryStructure");
      }

      return {
        ...state,
        dataEntryStructure,
        formState,
        targetFormSectionId,
        previousResults: action.dataEntry.previous_results ?? null,
        results,
        source: action.dataEntry.source,
        dataEntryStatus: action.dataEntry.status,
        error: null,
      };
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
        cache: action.status === "saving" && state.cache?.key === action.sectionId ? null : state.cache,
      };
    case "SET_CACHE":
      return {
        ...state,
        cache: action.cache,
      };
    case "UPDATE_FORM_SECTION": {
      assertStateIsLoaded(state);
      const existingSection = state.formState.sections[action.sectionId];
      if (!existingSection) {
        throw new Error(`Section ${action.sectionId} not found in form state`);
      }

      return {
        ...state,
        formState: {
          ...state.formState,
          sections: {
            ...state.formState.sections,
            [action.sectionId]: {
              ...existingSection,
              ...action.partialFormSection,
            },
          },
        },
      };
    }
    case "FORM_SAVE_FAILED":
      return {
        ...state,
        status: "idle",
        error: action.error,
      };
    case "FORM_SAVED": {
      assertStateIsLoaded(state);
      const formState = updateFormStateAfterSubmit(
        state.dataEntryStructure,
        state.formState,
        action.validationResults,
        action.sectionId,
        action.continueToNextSection,
      );

      return {
        ...state,
        status: "idle",
        error: null,
        results: action.data,
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
