import { Election } from "@kiesraad/api";
import { getInitialFormState } from "../pollingStationUtils";
import { DataEntryAction, DataEntryState } from "./types";

export function getInitialState(election: Required<Election>): DataEntryState {
    return {
        initialData: null,
        error: null,
        pollingStationResults: null,
        formState: getInitialFormState(election),
        targetFormSectionID: null,
        status: "idle",
        currentForm: null,
        temporaryCache: null
    };
}

export default function dataEntryReducer(state: DataEntryState, action: DataEntryAction) {


    return state;
}
