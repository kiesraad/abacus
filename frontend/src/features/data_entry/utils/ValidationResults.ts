import { ValidationResult, ValidationResultCode } from "@/types/generated/openapi";
import { DataEntryStructure, FormSectionId } from "@/types/types";

import { FormState } from "../types/types";

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
 * Maps a field name as used in a ValidationResult to a form section as used in the data entry state.
 */
export function mapFieldNameToFormSection(fieldName: string, dataEntryStructure: DataEntryStructure): FormSectionId {
  // Remove "data." prefix if present
  const normalizedFieldName = fieldName.startsWith("data.") ? fieldName.substring(5) : fieldName;

  // First, try to find exact match in the data entry structure
  for (const section of dataEntryStructure) {
    for (const subsection of section.subsections) {
      if (subsection.type === "radio" && subsection.path === normalizedFieldName) {
        return section.id;
      }

      if (subsection.type === "inputGrid") {
        for (const row of subsection.rows) {
          if (row.path === normalizedFieldName) {
            return section.id;
          }
        }
      }
    }
  }

  // Fallback: handle parent object paths
  // For cases like "data.political_group_votes[0]" or "data.voters_counts"
  for (const section of dataEntryStructure) {
    for (const subsection of section.subsections) {
      if (subsection.type === "radio" && subsection.path.startsWith(normalizedFieldName + ".")) {
        return section.id;
      }

      if (subsection.type === "inputGrid") {
        for (const row of subsection.rows) {
          if (row.path.startsWith(normalizedFieldName + ".") || row.path.startsWith(normalizedFieldName + "[")) {
            return section.id;
          }
        }
      }
    }
  }

  throw new Error(`Field "${fieldName}" could not be mapped to any form section in the data entry structure.`);
}

/*
 * Returns the set of form sections for a given validation result.
 */
export function getFormSectionsForValidationResult(
  validationResult: ValidationResult,
  dataEntryStructure: DataEntryStructure,
): Set<FormSectionId> {
  return new Set(validationResult.fields.map((field) => mapFieldNameToFormSection(field, dataEntryStructure)));
}

/*
 * Distributes validation results to the corresponding sections in the form state, but only if that section is saved.
 */
export function addValidationResultsToFormState(
  validationResults: ValidationResult[],
  formState: FormState,
  dataEntryStructure: DataEntryStructure,
  errorsOrWarnings: "errors" | "warnings",
) {
  for (const validationResult of validationResults) {
    const formSections = getFormSectionsForValidationResult(validationResult, dataEntryStructure);
    for (const formSection of formSections) {
      if (formState.sections[formSection] && formState.sections[formSection].isSaved) {
        formState.sections[formSection][errorsOrWarnings].add(validationResult);
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
