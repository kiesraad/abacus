import { t } from "@/i18n/translate";
import type { Candidate } from "@/types/generated/openapi";

/**
 * Formats a candidate name for display. Optionally with first name (if present).
 */
export function getCandidateFullName(candidate: Candidate, withFirstName = true): string {
  let name = candidate.last_name.charAt(0).toUpperCase() + candidate.last_name.slice(1);
  name += `, ${candidate.initials}`;

  if (candidate.first_name && withFirstName) {
    name += ` (${candidate.first_name})`;
  }

  if (candidate.last_name_prefix) {
    name += ` ${candidate.last_name_prefix}`;
  }

  return name;
}

export function getCandidateFullNameWithGender(candidate: Candidate): string {
  const fullName = getCandidateFullName(candidate);
  const gender = candidate.gender ? t(`candidate.${candidate.gender}`) : undefined;
  return gender ? `${fullName} (${gender})` : fullName;
}

export function getCandidateLocalityWithCountryCode(candidate: Candidate): string {
  return candidate.country_code ? `${candidate.locality} (${candidate.country_code})` : candidate.locality;
}
