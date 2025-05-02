import { PoliticalGroup, PoliticalGroupVotes, PollingStationResults } from "@/types/generated/openapi";

import { DataEntrySection, DataEntryValue, getFromResults } from "./dataEntry";

export function sectionHasDifferences(
  section: DataEntrySection,
  first: PollingStationResults,
  second: PollingStationResults,
) {
  return section.fields.some(
    (field) => !isEqual(getFromResults(first, field.path), getFromResults(second, field.path)),
  );
}

export function groupHasDifferences(pg: PoliticalGroup, first?: PoliticalGroupVotes, second?: PoliticalGroupVotes) {
  return pg.candidates.some((_, i) => !isEqual(first?.candidate_votes[i]?.votes, second?.candidate_votes[i]?.votes));
}

function isEqual(firstValue: DataEntryValue, secondValue: DataEntryValue): boolean {
  // Two falsy values are considered equal (e.g. 0 and undefined)
  return firstValue === secondValue || (!firstValue && !secondValue);
}
