export function getCategoryRowUrl(pollingStationStatus: string | undefined, pollingStationId: number): string | null {
  switch (pollingStationStatus) {
    case "first_entry_not_started":
      return null;
    case "entries_different":
      return `./${pollingStationId}/resolve-differences`;
    default:
      return `./${pollingStationId}/detail`;
  }
}
