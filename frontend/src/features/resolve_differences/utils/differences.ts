import type { DataEntryResults, DataEntrySection } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";

export function sectionHasDifferences(
  section: DataEntrySection,
  first: DataEntryResults,
  second: DataEntryResults,
): boolean {
  const firstValues = mapResultsToSectionValues(section, first);
  const secondValues = mapResultsToSectionValues(section, second);

  const firstKeys = Object.keys(firstValues);
  const secondKeys = Object.keys(secondValues);

  // Check if the number of keys differs
  if (firstKeys.length !== secondKeys.length) {
    return true;
  }

  // Check if all keys from first object exist in second object
  for (const key of firstKeys) {
    if (!(key in secondValues)) {
      return true;
    }
  }

  // Check if any values differ
  for (const key of firstKeys) {
    if (firstValues[key] !== secondValues[key]) {
      return true;
    }
  }

  return false;
}
