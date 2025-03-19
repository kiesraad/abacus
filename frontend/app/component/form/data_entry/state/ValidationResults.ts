import { ValidationResult, ValidationResultCode } from "@kiesraad/api";

import { FormSectionId, FormState } from "./types";

/*
 * A set of validation results.
 */
export class ValidationResultSet {
  private entries: Set<ValidationResult>;

  constructor(entries?: ValidationResult[]) {
    this.entries = new Set(entries);
  }

  add(entry: ValidationResult): void {
    this.entries.add(entry);
  }

  includes(code: ValidationResultCode): boolean {
    return Array.from(this.entries).some((entry) => entry.code === code);
  }

  isEmpty(): boolean {
    return this.entries.size === 0;
  }

  size(): number {
    return this.entries.size;
  }

  getCodes(): ValidationResultCode[] {
    return Array.from(this.entries).map((entry) => entry.code);
  }

  getFields(): Set<string> {
    return new Set(Array.from(this.entries).flatMap((entry) => entry.fields));
  }

  hasOnlyGlobalValidationResults(): boolean {
    return Array.from(this.entries).every((entry) => isGlobalValidationResult(entry));
  }

  removeGlobalValidationResults(): void {
    this.entries = new Set(Array.from(this.entries).filter((entry) => !isGlobalValidationResult(entry)));
  }
}

/*
 * Is a validation result a global validation result?
 * Global validation results are only shown when the entire data entry form is completed.
 */
export function isGlobalValidationResult(validationResult: ValidationResult): boolean {
  return validationResult.code === "F204";
}

/*
 * Maps a field name as used in a ValidationResult to a field section as used in the data entry state.
 */
export function mapFieldNameToFieldSection(fieldName: string): FormSectionId | null {
  const parts = fieldName.split(".");
  if (parts[1] === undefined) return null;
  const section = parts[1].split("[")[0];
  switch (section) {
    case "recounted":
      return "recounted";
    case "votes_counts":
    case "voters_counts":
    case "voters_recounts":
      return "voters_votes_counts";
    case "differences_counts":
      return "differences_counts";
    case "political_group_votes": {
      const index = parseInt(parts[1].substring(parts[1].indexOf("[") + 1, parts[1].indexOf("]"))) + 1;
      return `political_group_votes_${index}`;
    }
    default:
      return null;
  }
}

/*
 * Returns the set of field sections for a given validation result.
 */
export function getFieldSectionsForValidationResult(validationResult: ValidationResult): Set<FormSectionId> {
  return new Set(validationResult.fields.map(mapFieldNameToFieldSection).filter((v) => v !== null));
}

/*
 * Distributes validation results to the corresponding sections in the form state, but only if that section is saved.
 */
export function addValidationResultsToFormState(
  validationResults: ValidationResult[],
  formState: FormState,
  errorsOrWarnings: "errors" | "warnings",
) {
  for (const validationResult of validationResults) {
    const fieldSections = getFieldSectionsForValidationResult(validationResult);
    for (const fieldSection of fieldSections) {
      if (formState.sections[fieldSection] && formState.sections[fieldSection].isSaved) {
        formState.sections[fieldSection][errorsOrWarnings].add(validationResult);
      }
    }
  }
}

/*
 * Create a map of field names and whether each field has an error or warnings. Warnings are only shown
 * if there are no errors in the form section.
 */
export function mapValidationResultsToFields(
  errors: ValidationResultSet,
  warnings: ValidationResultSet,
): Map<string, "error" | "warning"> {
  const result = new Map<string, "error" | "warning">();
  if (!errors.isEmpty()) {
    for (const field of errors.getFields()) {
      result.set(field, "error");
    }
  } else {
    for (const field of warnings.getFields()) {
      result.set(field, "warning");
    }
  }
  return result;
}
