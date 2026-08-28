import type { ReactNode } from "react";
import { t, tOrDefault, txOrDefault } from "@/i18n/translate";
import type { Election, ValidationResult, ValidationResultCode } from "@/types/generated/openapi";
import type { DataEntrySection } from "@/types/types";

/*
 * A set of validation results.
 */
export class ValidationResultSet {
  private readonly entries: Set<ValidationResult>;

  constructor(entries?: ValidationResult[]) {
    this.entries = new Set(entries);
  }

  add(entry: ValidationResult): void {
    this.entries.add(entry);
  }

  find(code: ValidationResultCode): ValidationResult | undefined {
    return Array.from(this.entries).find((entry) => entry.code === code);
  }

  isEmpty(): boolean {
    return this.entries.size === 0;
  }

  size(): number {
    return this.entries.size;
  }

  getAll(): ValidationResult[] {
    return Array.from(this.entries);
  }

  getFields(): Set<string> {
    return new Set(Array.from(this.entries).flatMap((entry) => entry.fields));
  }
}

/*
 * Checks if a validation result applies to a specific form section.
 * This function avoids iterating through all sections in the data entry structure
 * by checking only the specific section provided.
 *
 * @param validationResult - The validation result to check
 * @param section - The specific section to check against
 * @returns true if the validation result applies to the section, false otherwise
 */
export function doesValidationResultApplyToSection(
  validationResult: ValidationResult,
  section: DataEntrySection,
): boolean {
  return validationResult.fields.some((field) => isFieldInSection(field, section));
}

/** Remove "data." prefix if present */
export function normalizeFieldName(fieldName: string): string {
  return fieldName.startsWith("data.") ? fieldName.substring(5) : fieldName;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO function should be refactored
export function isFieldInSection(fieldName: string, section: DataEntrySection): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  // Check exact matches in the section
  for (const subsection of section.subsections) {
    switch (subsection.type) {
      case "radio":
        if (subsection.path === normalizedFieldName) {
          return true;
        }
        break;

      case "inputGrid":
        for (const row of subsection.rows) {
          if (row.path === normalizedFieldName) {
            return true;
          }
        }
        break;

      case "checkboxes":
        for (const option of subsection.options) {
          if (option.path === normalizedFieldName) {
            return true;
          }
        }
        break;
    }
  }

  // Check parent object paths
  for (const subsection of section.subsections) {
    switch (subsection.type) {
      case "radio":
        if (subsection.path.startsWith(`${normalizedFieldName}.`)) {
          return true;
        }
        break;

      case "inputGrid":
        for (const row of subsection.rows) {
          if (row.path.startsWith(`${normalizedFieldName}.`) || row.path.startsWith(`${normalizedFieldName}[`)) {
            return true;
          }
        }
        break;

      case "checkboxes":
        for (const option of subsection.options) {
          if (option.path.startsWith(`${normalizedFieldName}.`)) {
            return true;
          }
        }
        break;
    }
  }

  return false;
}

/*
 * Create a map of field names and whether each field has an error or warning.
 */
export function mapValidationResultSetsToFields(
  errors: ValidationResultSet,
  warnings: ValidationResultSet,
): Map<string, "error" | "warning"> {
  const result = new Map<string, "error" | "warning">();
  for (const field of warnings.getFields()) {
    result.set(field, "warning");
  }
  // an error overwrites a warning on a field
  for (const field of errors.getFields()) {
    result.set(field, "error");
  }
  return result;
}

/*
 * Returns a ValidationResultSet containing validation results that apply to the given section.
 *
 * @param validationResults - Array of validation results to filter
 * @param section - The data entry section to filter results for
 */
export function getValidationResultSetForSection(
  validationResults: ValidationResult[],
  section: DataEntrySection,
): ValidationResultSet {
  const filteredResults = validationResults.filter((validationResult) =>
    doesValidationResultApplyToSection(validationResult, section),
  );
  return new ValidationResultSet(filteredResults);
}

export function dottedCode(code: ValidationResultCode): string {
  return `${code[0]}.${code.slice(1)}`;
}

export type ValidationResultTranslations = {
  code: string;
  title: string;
  content: ReactNode | undefined;
  actions: ReactNode | undefined;
};

/**
 * Get the translations for showing a ValidationResult, given an election and a user role.
 */
export function getTranslations(
  election: Election,
  result: ValidationResult,
  role: "coordinator" | "typist",
): ValidationResultTranslations {
  const defaultTitle = role === "typist" ? t(`feedback.typist_title`) : "";

  const basePath = `feedback_${election.committee_category}.${result.code}.${role}`;
  let title = tOrDefault(`${basePath}.title`, { ...result.context }, defaultTitle);
  let content = txOrDefault(`${basePath}.content`, undefined, { ...result.context }, undefined);
  let actions = txOrDefault(`${basePath}.actions`, undefined, { ...result.context }, undefined);

  if (election.counting_method === "DSO") {
    const basePath = `feedback_${election.committee_category}_DSO.${result.code}.${role}`;
    title = tOrDefault(`${basePath}.title`, { ...result.context }, title);
    content = txOrDefault(`${basePath}.content`, undefined, { ...result.context }, content);
    actions = txOrDefault(`${basePath}.actions`, undefined, { ...result.context }, actions);
  }

  return { code: dottedCode(result.code), title, content, actions };
}
