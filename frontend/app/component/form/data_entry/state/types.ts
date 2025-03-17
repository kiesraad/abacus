import { Dispatch } from "react";

import {
  AnyApiError,
  ClaimDataEntryResponse,
  Election,
  PollingStationResults,
  ValidationResult,
  ValidationResults,
} from "@kiesraad/api";

export interface DataEntryState {
  // state from providers
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;

  // api error objects
  error: AnyApiError | null;

  // backend data structure
  pollingStationResults: PollingStationResults | null;

  // state of the forms excl. data
  formState: FormState;
  targetFormSectionId: FormSectionId | null;
  status: Status;

  cache: TemporaryCache | null;
}

export interface DataEntryStateAndActions extends DataEntryState {
  dispatch: DataEntryDispatch;
  onSubmitForm: (data: Partial<PollingStationResults>, options?: SubmitCurrentFormOptions) => Promise<boolean>;
  onDeleteDataEntry: () => Promise<boolean>;
  onFinaliseDataEntry: () => Promise<boolean>;
  register: (form: FormSectionReference) => void;
  setCache: (cache: TemporaryCache) => void;
  updateFormSection: (partialFormSection: Partial<FormSection>) => void;
}

export interface DataEntryStateAndActionsLoaded extends DataEntryStateAndActions {
  pollingStationResults: PollingStationResults;
}

export type DataEntryDispatch = Dispatch<DataEntryAction>;

export type DataEntryAction =
  | {
      type: "DATA_ENTRY_LOADED";
      dataEntry: ClaimDataEntryResponse;
    }
  | {
      type: "DATA_ENTRY_LOAD_FAILED";
      error: AnyApiError;
    }
  | {
      type: "DATA_ENTRY_SAVE_FAILED";
      error: AnyApiError;
    }
  | {
      type: "DATA_ENTRY_NOT_FOUND";
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
      form: FormSectionReference;
    };

export type FormSectionData =
  | Pick<PollingStationResults, "recounted">
  | Pick<PollingStationResults, "voters_counts" | "votes_counts" | "voters_recounts">
  | Pick<PollingStationResults, "differences_counts">
  | PollingStationResults["political_group_votes"][0]
  | object; // save

export interface SubmitCurrentFormOptions {
  acceptWarnings?: boolean;
  aborting?: boolean;
  continueToNextSection?: boolean;
  showAcceptWarnings?: boolean;
}

export type FormSectionId =
  | "recounted"
  | "voters_votes_counts"
  | "differences_counts"
  | `political_group_votes_${number}`
  | "save";

export type FormSectionReference =
  | {
      id: "recounted";
      type: "recounted";
    }
  | {
      id: "voters_votes_counts";
      type: "voters_and_votes";
    }
  | {
      id: "differences_counts";
      type: "differences";
    }
  | {
      id: `political_group_votes_${number}`;
      type: "political_group_votes";
      number: number;
    }
  | {
      id: "save";
      type: "save";
    };

//store unvalidated data
export type TemporaryCache = {
  key: FormSectionId;
  data: Partial<PollingStationResults>;
};

// Status of the form controller
// This is a type instead of an enum because of https://github.com/ArnaudBarre/eslint-plugin-react-refresh/issues/36
export type Status = "idle" | "saving" | "deleting" | "deleted" | "finalising" | "finalised" | "aborted";

export interface ClientValidationResult extends ValidationResult {
  isGlobal?: boolean;
}

export interface ClientState {
  furthest: FormSectionId;
  current: FormSectionId;
  acceptedWarnings: FormSectionId[];
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
  title?: string;
  hasChanges: boolean;
  isSaved: boolean; //whether this section has been sent to the server
  isSubmitted?: boolean; //whether this section has been submitted in the latest request
  acceptWarnings: boolean;
  acceptWarningsError: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
};
