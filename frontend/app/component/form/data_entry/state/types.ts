import { AnyApiError, GetDataEntryResponse, PollingStationResults } from "@kiesraad/api";
import { Dispatch } from "react";
import { AnyFormReference, FormSectionID, FormState, Status, TemporaryCache } from "../PollingStationFormController";

export interface DataEntryState {
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
    
}

export type DataEntryDispatch = Dispatch<DataEntryAction>;

export type DataEntryAction = {
    type: "DATA_ENTRY_LOADED";
    dataEntry: GetDataEntryResponse;
} | {
    type: "DATA_ENTRY_LOAD_FAILED";
    error: AnyApiError;
};

