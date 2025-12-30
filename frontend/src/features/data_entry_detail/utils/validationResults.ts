import type { ValidationResults } from "@/types/generated/openapi";

/** Determines if the index page with errors and warnings should be shown for these validation results */
export function showIndexPage(validationResults: ValidationResults) {
  return validationResults.errors.length > 0 || validationResults.warnings.length > 0;
}
