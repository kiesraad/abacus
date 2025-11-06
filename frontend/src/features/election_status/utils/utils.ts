export function getCategoryRowUrl(
  pollingStationStatus: string | undefined,
  pollingStationId: number,
  isCoordinator: boolean,
): string | null {
  let link = null;

  switch (pollingStationStatus) {
    case "entries_different":
      link = `./${pollingStationId}/resolve-differences`;
      break;
    case "first_entry_has_errors":
      link = `./${pollingStationId}/detail`;
      break;
    default:
      if (isCoordinator && pollingStationStatus != "first_entry_not_started") {
        link = `./${pollingStationId}/detail`;
      }
      break;
  }

  return link;
}
