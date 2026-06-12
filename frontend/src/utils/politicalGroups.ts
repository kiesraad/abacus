import type { PoliticalGroup } from "@/types/generated/openapi";

export function getNumberOfCandidates(politicalGroups: PoliticalGroup[]) {
  let numberOfCandidates = 0;
  for (const pg of politicalGroups) {
    numberOfCandidates += pg.candidates.length;
  }
  return numberOfCandidates;
}
