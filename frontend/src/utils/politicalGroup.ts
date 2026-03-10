import { t } from "@/i18n/translate";
import type { Candidate, PoliticalGroup } from "@/types/generated/openapi";
import { getCandidateFullName } from "./candidate";

/**
 * Formats a political group name for display. Optionally with political group number prefix.
 * For named groups: "Lijst {number} - {name}"
 * For unnamed groups: "Lijst {number} - Blanco {first_candidate_full_name_without_first_name}"
 */
export function formatPoliticalGroupName(politicalGroup: PoliticalGroup | undefined, withPrefix = true): string {
  if (politicalGroup) {
    return getPoliticalGroupName(politicalGroup.number, politicalGroup.name, politicalGroup.candidates[0], withPrefix);
  } else {
    return "";
  }
}

export function getPoliticalGroupName(
  number: number,
  name: string,
  first_candidate: Candidate | undefined,
  withPrefix = true,
): string {
  let listPrefix = "";
  if (withPrefix) {
    listPrefix += `${t("list")} ${number} - `;
  }

  if (name === "") {
    if (first_candidate) {
      return `${listPrefix}Blanco (${getCandidateFullName(first_candidate, false)})`;
    } else {
      return `${listPrefix}Blanco`;
    }
  } else {
    return `${listPrefix}${name}`;
  }
}
