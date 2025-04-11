import { describe, expect, test } from "vitest";

import { Candidate } from "@/api/gen/openapi";

import { getCandidateFullName, getCandidateFullNameWithGender } from "./candidate";

const last_name_prefix = "de";
const last_name = "Boer";
const initials = "A.B.";
const first_name = "Anne";
const gender = "Female";

describe("getCandidateFullName util", () => {
  test("without first name", () => {
    const candidate = { last_name, initials } as Candidate;
    expect(getCandidateFullName(candidate)).toBe("Boer, A.B.");
  });

  test("with first name", () => {
    const candidate = { last_name, initials, first_name } as Candidate;
    expect(getCandidateFullName(candidate)).toBe("Boer, A.B. (Anne)");
  });

  test("with firstname and lastname prefix", () => {
    const candidate = { last_name_prefix, last_name, initials, first_name } as Candidate;
    expect(getCandidateFullName(candidate)).toBe("De Boer, A.B. (Anne)");
  });
});

describe("getCandidateFullNameWithGender util", () => {
  test("with gender", () => {
    const candidate = { last_name, initials, first_name, gender } as Candidate;
    expect(getCandidateFullNameWithGender(candidate)).toBe("Boer, A.B. (Anne) (v)");
  });

  test("without gender", () => {
    const candidate = { last_name, initials, first_name } as Candidate;
    expect(getCandidateFullNameWithGender(candidate)).toBe("Boer, A.B. (Anne)");
  });
});
