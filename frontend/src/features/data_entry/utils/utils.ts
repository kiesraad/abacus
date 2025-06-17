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
