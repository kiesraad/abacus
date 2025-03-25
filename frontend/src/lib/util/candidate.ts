import { Candidate } from "@/api";

export function getCandidateFullName(candidate: Candidate): string {
  const last_name = candidate.last_name_prefix
    ? `${candidate.last_name_prefix} ${candidate.last_name}`
    : candidate.last_name;
  return candidate.first_name
    ? `${last_name}, ${candidate.initials} (${candidate.first_name})`
    : `${last_name}, ${candidate.initials}`;
}
