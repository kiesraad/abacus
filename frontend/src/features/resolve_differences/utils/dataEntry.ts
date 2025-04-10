import { PollingStationResults } from "@/api/gen/openapi";
import { FormSectionId } from "@/types/types";

type ObjectPath<T> = {
  // For each entry, if it is an object (including optional)
  [K in keyof T]: NonNullable<T[K]> extends object
    ? T[K] extends unknown[]
      ? never // Skip arrays, which are also objects
      : `${K & string}.${Extract<keyof NonNullable<T[K]>, string>}` // "parent.child" template literal for string keys
    : K & string; // else, the key itself when it is a string
}[keyof T]; // Get all values together

type SectionId = Extract<FormSectionId, "recounted" | "voters_votes_counts" | "differences_counts">;

export type PollingStationResultsPath = NonNullable<ObjectPath<PollingStationResults>>;

export interface DataEntrySection {
  id: SectionId;
  fields: { code?: string; path: PollingStationResultsPath }[];
}

export const sections: DataEntrySection[] = [
  {
    id: "recounted",
    fields: [{ path: "recounted" }],
  },
  {
    id: "voters_votes_counts",
    fields: [
      { code: "A", path: "voters_counts.poll_card_count" },
      { code: "B", path: "voters_counts.proxy_certificate_count" },
      { code: "C", path: "voters_counts.voter_card_count" },
      { code: "D", path: "voters_counts.total_admitted_voters_count" },
      { code: "E", path: "votes_counts.votes_candidates_count" },
      { code: "F", path: "votes_counts.blank_votes_count" },
      { code: "G", path: "votes_counts.invalid_votes_count" },
      { code: "H", path: "votes_counts.total_votes_cast_count" },
      { code: "A.2", path: "voters_recounts.poll_card_count" },
      { code: "B.2", path: "voters_recounts.proxy_certificate_count" },
      { code: "C.2", path: "voters_recounts.voter_card_count" },
      { code: "D.2", path: "voters_recounts.total_admitted_voters_count" },
    ],
  },
  {
    id: "differences_counts",
    fields: [
      { code: "I", path: "differences_counts.more_ballots_count" },
      { code: "J", path: "differences_counts.fewer_ballots_count" },
      { code: "K", path: "differences_counts.unreturned_ballots_count" },
      { code: "L", path: "differences_counts.too_few_ballots_handed_out_count" },
      { code: "M", path: "differences_counts.too_many_ballots_handed_out_count" },
      { code: "N", path: "differences_counts.other_explanation_count" },
      { code: "O", path: "differences_counts.no_explanation_count" },
    ],
  },
];

export function getFromResults(results: PollingStationResults, path: PollingStationResultsPath) {
  const segments = path.split(".");
  return segments.reduce((o: unknown, k: string) => {
    if (o && typeof o === "object" && k in o) {
      return o[k as keyof typeof o] as string | number | boolean | undefined;
    } else {
      return undefined;
    }
  }, results) as string | number | boolean | undefined;
}
