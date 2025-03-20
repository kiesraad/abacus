import { DataEntryStatusName } from "@kiesraad/api";

export function getUrlForDataEntry(
  electionId: number,
  pollingStationId: number,
  pollingStationStatus?: DataEntryStatusName,
): string {
  const entryNumber = pollingStationStatus?.startsWith("second_entry") ? 2 : 1;
  return `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}`;
}
