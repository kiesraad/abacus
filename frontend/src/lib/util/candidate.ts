import { Candidate } from "@/api";

import { t } from "@kiesraad/i18n";

export function getCandidateFullName(candidate: Candidate): string {
  const gender = candidate.gender ? t(`candidate.${candidate.gender}`) : undefined;
  const last_name = candidate.last_name_prefix
    ? `${candidate.last_name_prefix} ${candidate.last_name}`
    : candidate.last_name;
  const full_name = candidate.first_name
    ? `${last_name}, ${candidate.initials} (${candidate.first_name})`
    : `${last_name}, ${candidate.initials}`;
  return candidate.gender ? full_name + ` (${gender})` : full_name;
}
