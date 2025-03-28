import { expect, test } from "vitest";

import { Candidate } from "@/api";

import { getCandidateFullName } from "./candidate";

test("getCandidateFullName util", () => {
  const candidateWithoutFirstName: Candidate = {
    initials: "A.B.",
    last_name: "Boer",
    locality: "Juinen",
    number: 1,
  };
  const candidateWithFirstName: Candidate = {
    ...candidateWithoutFirstName,
    first_name: "Anne",
    number: 2,
  };
  const candidateWithFirstNameAndLastNamePrefix: Candidate = {
    ...candidateWithFirstName,
    last_name_prefix: "de",
    number: 3,
  };
  const candidateWithFirstNameAndLastNamePrefixAndGender: Candidate = {
    ...candidateWithFirstNameAndLastNamePrefix,
    gender: "Female",
    number: 4,
  };
  const fullNameWithoutFirstName = getCandidateFullName(candidateWithoutFirstName, false);
  const fullNameWithFirstName = getCandidateFullName(candidateWithFirstName, false);
  const fullNameWithFirstNameAndLastNamePrefix = getCandidateFullName(candidateWithFirstNameAndLastNamePrefix, true);
  const fullNameWithFirstNameAndLastNamePrefixAndGender = getCandidateFullName(
    candidateWithFirstNameAndLastNamePrefixAndGender,
    true,
  );
  expect(fullNameWithoutFirstName).toBe("Boer, A.B.");
  expect(fullNameWithFirstName).toBe("Boer, A.B. (Anne)");
  expect(fullNameWithFirstNameAndLastNamePrefix).toBe("de Boer, A.B. (Anne)");
  expect(fullNameWithFirstNameAndLastNamePrefixAndGender).toBe("de Boer, A.B. (Anne) (v)");
});
