import { Candidate } from "@/api";

import { t } from "@kiesraad/i18n";

export function getCandidateFullName(candidate: Candidate): string {
  const lastName = candidate.last_name_prefix
    ? `${candidate.last_name_prefix} ${candidate.last_name}`
    : candidate.last_name;

  return candidate.first_name
    ? `${lastName}, ${candidate.initials} (${candidate.first_name})`
    : `${lastName}, ${candidate.initials}`;
}

export function getCandidateFullNameWithGender(candidate: Candidate): string {
  const fullName = getCandidateFullName(candidate);
  const gender = candidate.gender ? t(`candidate.${candidate.gender}`) : undefined;
  return gender ? fullName + ` (${gender})` : fullName;
}
