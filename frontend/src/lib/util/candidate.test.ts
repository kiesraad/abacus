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
  const fullNameWithoutFirstName = getCandidateFullName(candidateWithoutFirstName);
  const fullNameWithFirstName = getCandidateFullName(candidateWithFirstName);
  const fullNameWithFirstNameAndLastNamePrefix = getCandidateFullName(candidateWithFirstNameAndLastNamePrefix);
  expect(fullNameWithoutFirstName).toBe("Boer, A.B.");
  expect(fullNameWithFirstName).toBe("Boer, A.B. (Anne)");
  expect(fullNameWithFirstNameAndLastNamePrefix).toBe("de Boer, A.B. (Anne)");
});
