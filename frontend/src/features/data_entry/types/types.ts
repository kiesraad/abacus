import { Dispatch } from "react";

import { AnyApiError } from "@/api/ApiResult";
import {
  ClaimDataEntryResponse,
  DataEntryStatus,
  ElectionWithPoliticalGroups,
  PollingStationResults,
  ValidationResults,
} from "@/types/generated/openapi";
import { DataEntryStructure, FormSectionId, SectionValues } from "@/types/types";

import { ValidationResultSet } from "../../../utils/ValidationResults";

export interface DataEntryState {
  // state from providers
  election: ElectionWithPoliticalGroups;
  pollingStationId: number;
  entryNumber: number;

  // api error objects
  error: AnyApiError | null;

  // backend data structure
  pollingStationResults: PollingStationResults | null;

  // state of the forms excl. data
  dataEntryStructure: DataEntryStructure;
  formState: FormState;
  targetFormSectionId: FormSectionId | null;
  status: Status;

  cache: TemporaryCache | null;
}

export interface DataEntryStateAndActions extends DataEntryState {
  dispatch: DataEntryDispatch;
  onSubmitForm: (currentValues: SectionValues, options?: SubmitCurrentFormOptions) => Promise<boolean>;
  onDeleteDataEntry: () => Promise<boolean>;
  onFinaliseDataEntry: () => Promise<DataEntryStatus | undefined>;
  register: (formSectionId: FormSectionId) => void;
  setCache: (cache: TemporaryCache) => void;
  updateFormSection: (partialFormSection: Partial<FormSection>) => void;
}

export interface DataEntryStateAndActionsLoaded extends DataEntryStateAndActions {
  pollingStationResults: PollingStationResults;
}

export type DataEntryDispatch = Dispatch<DataEntryAction>;

export type DataEntryAction =
  | {
      type: "DATA_ENTRY_CLAIMED";
      dataEntry: ClaimDataEntryResponse;
    }
  | {
      type: "DATA_ENTRY_CLAIM_FAILED";
      error: AnyApiError;
    }
  | {
      type: "DATA_ENTRY_SAVE_FAILED";
      error: AnyApiError;
    }
  | {
      type: "FORM_SAVE_FAILED";
      error: AnyApiError;
    }
  | {
      type: "FORM_SAVED";
      data: PollingStationResults;
      validationResults: ValidationResults;
      aborting: boolean;
      continueToNextSection: boolean;
    }
  | {
      type: "SET_STATUS";
      status: Status;
    }
  | {
      type: "SET_CACHE";
      cache: TemporaryCache;
    }
  | {
      type: "UPDATE_FORM_SECTION";
      partialFormSection: Partial<FormSection>;
    }
  | {
      type: "RESET_TARGET_FORM_SECTION";
    }
  | {
      type: "REGISTER_CURRENT_FORM";
      formSectionId: FormSectionId;
    };

export interface SubmitCurrentFormOptions {
  acceptErrorsAndWarnings?: boolean;
  aborting?: boolean;
  continueToNextSection?: boolean;
  showAcceptErrorsAndWarnings?: boolean;
}

//store unvalidated data
export type TemporaryCache = {
  key: FormSectionId;
  data: SectionValues;
};

// Status of the form controller
// This is a type instead of an enum because of https://github.com/ArnaudBarre/eslint-plugin-react-refresh/issues/36
export type Status = "idle" | "saving" | "deleting" | "deleted" | "finalising" | "finalised" | "aborted";

export interface ClientState {
  furthest: FormSectionId;
  current: FormSectionId;
  acceptedErrorsAndWarnings: FormSectionId[];
  continue: boolean;
}

export interface FormState {
  // the furthest form section that the user has reached
  furthest: FormSectionId;
  // the form section that the user is currently working on
  current: FormSectionId;
  sections: Record<FormSectionId, FormSection>;
}

export type FormSection = {
  index: number; //fixate the order of filling in sections
  id: FormSectionId;
  hasChanges: boolean;
  isSaved: boolean; //whether this section has been sent to the server
  isSubmitted?: boolean; //whether this section has been submitted in the latest request
  acceptErrorsAndWarnings: boolean;
  acceptErrorsAndWarningsError: boolean;
  errors: ValidationResultSet;
  warnings: ValidationResultSet;
};
