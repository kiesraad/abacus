type Sortable = { name: string; number: number; type: "PollingStation" } | { name: string; type?: "SubCommittee" };

// To be used with lists of both DataEntrySource types and with RegionDetails[]
export function sortList<T>(list: T[], by: (item: T) => Sortable): T[] {
  return [...list].sort((itemA, itemB) => {
    const a = by(itemA);
    const b = by(itemB);

    // Sort polling stations by number in ascending order
    if (a.type === "PollingStation" && b.type === "PollingStation") {
      return a.number - b.number;
    }

    // Sort other lists alphabetically by name (ignoring leading `'s-`) in ascending order
    return a.name.replace(/^('s-)/, "").localeCompare(b.name.replace(/^('s-)/, ""), "nl");
  });
}
