import type { DataEntryState, DataEntryStateLoaded, EntryNumber } from "@/features/data_entry/types/types";
import type { DataEntryId, ElectionId } from "@/types/generated/openapi";
import type { FormSectionId } from "@/types/types";

export function getBaseUrl(electionId: ElectionId, dataEntryId: DataEntryId, entryNumber: EntryNumber) {
  return `/elections/${electionId}/data-entry/${dataEntryId}/${entryNumber}`;
}

export function getUrlForFormSectionID(
  electionId: ElectionId,
  dataEntryId: DataEntryId,
  entryNumber: EntryNumber,
  sectionId: FormSectionId,
) {
  const baseUrl = getBaseUrl(electionId, dataEntryId, entryNumber);
  return `${baseUrl}/${sectionId}`;
}

/**
 * Check if results, dataEntryStructure, formState are all initialized.
 */
export function isStateLoaded(state: DataEntryState): state is DataEntryStateLoaded {
  return state.results !== null && state.dataEntryStructure !== null && state.formState !== null;
}

/**
 * Assert that results, dataEntryStructure, formState are all initialized.
 */
export function assertStateIsLoaded(state: DataEntryState): asserts state is DataEntryStateLoaded {
  if (!isStateLoaded(state)) {
    throw new Error("State is not in loaded state");
  }
}
