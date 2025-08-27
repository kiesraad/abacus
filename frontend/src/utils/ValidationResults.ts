import { ValidationResult, ValidationResultCode } from "@/types/generated/openapi";
import { DataEntrySection } from "@/types/types";

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
  return validationResult.fields.some((fieldName) => {
    // Remove "data." prefix if present
    const normalizedFieldName = fieldName.startsWith("data.") ? fieldName.substring(5) : fieldName;

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
          if (subsection.path.startsWith(normalizedFieldName + ".")) {
            return true;
          }
          break;

        case "inputGrid":
          for (const row of subsection.rows) {
            if (row.path.startsWith(normalizedFieldName + ".") || row.path.startsWith(normalizedFieldName + "[")) {
              return true;
            }
          }
          break;

        case "checkboxes":
          for (const option of subsection.options) {
            if (option.path.startsWith(normalizedFieldName + ".")) {
              return true;
            }
          }
          break;
      }
    }

    return false;
  });
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
