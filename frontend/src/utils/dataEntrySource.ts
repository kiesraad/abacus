import type { DataEntrySource } from "@/types/generated/openapi";

/// The number for listing a sub committee (authority_id formatted in the backend
/// to e.g. "0035") or a polling station (plain number).
export function getDataEntrySourceNumber(source: DataEntrySource): string {
  return source.type === "SubCommittee" ? source.authority_id : String(source.number);
}

/// Returns the label for a sub committee or the number of a polling station.
export function getDataEntrySourceLabel(source: DataEntrySource): string {
  return source.type === "SubCommittee" ? source.name : String(source.number);
}
