import { DataEntryState, DataEntryStateLoaded } from "@/features/data_entry/types/types";
import { FormSectionId } from "@/types/types";

export function getBaseUrl(electionId: number, pollingStationId: number, entryNumber: number) {
  return `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}`;
}

export function getUrlForFormSectionID(
  electionId: number,
  pollingStationId: number,
  entryNumber: number,
  sectionId: FormSectionId,
) {
  const baseUrl = getBaseUrl(electionId, pollingStationId, entryNumber);
  return `${baseUrl}/${sectionId}`;
}

/**
 * Check if pollingStationResults, dataEntryStructure, formState are all initialized.
 */
export function isStateLoaded(state: DataEntryState): state is DataEntryStateLoaded {
  return state.pollingStationResults !== null && state.dataEntryStructure !== null && state.formState !== null;
}

/**
 * Assert that pollingStationResults, dataEntryStructure, formState are all initialized.
 */
export function assertStateIsLoaded(state: DataEntryState): asserts state is DataEntryStateLoaded {
  if (!isStateLoaded(state)) {
    throw new Error("State is not in loaded state");
  }
}
