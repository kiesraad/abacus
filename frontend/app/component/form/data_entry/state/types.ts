import { Dispatch } from "react";

import { AnyApiError, Election, GetDataEntryResponse, PollingStationResults } from "@kiesraad/api";

import { AnyFormReference, FormSectionID, FormState, Status, TemporaryCache } from "../PollingStationFormController";

export interface DataEntryState {
  election: Required<Election>;
  initialData: GetDataEntryResponse | null;
  error: AnyApiError | null;
  pollingStationResults: PollingStationResults | null;
  formState: FormState;
  targetFormSectionID: FormSectionID | null;
  status: Status;
  currentForm: AnyFormReference | null;
  temporaryCache: TemporaryCache | null;
}

export interface DataEntryStateAndActions extends DataEntryState {
  registerCurrentForm: (form: AnyFormReference) => void;
}

export type DataEntryDispatch = Dispatch<DataEntryAction>;

export type DataEntryAction =
  | {
      type: "DATA_ENTRY_LOADED";
      dataEntry: GetDataEntryResponse;
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
      type: "REGISTER_CURRENT_FORM";
      form: AnyFormReference;
    };
