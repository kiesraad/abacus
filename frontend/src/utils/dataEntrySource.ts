import type { DataEntrySource } from "@/types/generated/openapi";

/// Municipality codes are always displayed using four digits. Every other
/// number is displayed as-is.
export function formatDataEntrySourceNumber(source: DataEntrySource): string {
  return source.type === "SubCommittee" && source.category === "GSB"
    ? String(source.number).padStart(4, "0")
    : String(source.number);
}
