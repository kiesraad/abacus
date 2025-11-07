import { DataEntryStatusName } from "@/types/generated/openapi.ts";

export function getCategoryRowUrl(
  pollingStationStatus: DataEntryStatusName | undefined,
  pollingStationId: number,
): string | null {
  switch (pollingStationStatus) {
    case "first_entry_not_started":
      return null;
    case "entries_different":
      return `./${pollingStationId}/resolve-differences`;
    default:
      return `./${pollingStationId}/detail`;
  }
}
