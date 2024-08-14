import * as React from "react";

import {
  ClientValidationResult,
  ErrorsAndWarnings,
  FieldValidationResult,
  ValidationResult,
} from "@kiesraad/api";
import { fieldNameFromPath } from "@kiesraad/util";

export function useErrorsAndWarnings(
  errors: ValidationResult[],
  warnings: ValidationResult[],
  clientWarnings: FieldValidationResult[],
) {
  return React.useMemo(() => {
    const result = new Map<string, ErrorsAndWarnings>();

    const process = (target: keyof ErrorsAndWarnings, arr: ValidationResult[]) => {
      arr.forEach((v) => {
        v.fields.forEach((f) => {
          const fieldName = fieldNameFromPath(f);
          if (!result.has(fieldName)) {
            result.set(fieldName, { errors: [], warnings: [] });
          }
          const field = result.get(fieldName);
          if (field) {
            field[target].push({
              code: v.code,
              id: fieldName,
            });
          }
        });
      });
    };

    if (errors.length > 0) {
      process("errors", errors);
    } else if (warnings.length > 0) {
      process("warnings", warnings);
    }

    clientWarnings.forEach((warning) => {
      if (!result.has(warning.id)) {
        result.set(warning.id, { errors: [], warnings: [] });
      }
      const field = result.get(warning.id);
      if (field) {
        field.warnings.push(warning);
      }
    });

    return result;
  }, [errors, warnings, clientWarnings]);
}

//TODO: intermediate step for testing, might scrap code above.
export function getErrorsAndWarnings(
  errors: ClientValidationResult[],
  warnings: ClientValidationResult[],
  clientWarnings: FieldValidationResult[],
): Map<string, ErrorsAndWarnings> {
  const result = new Map<string, ErrorsAndWarnings>();

  const process = (target: keyof ErrorsAndWarnings, arr: ClientValidationResult[]) => {
    arr.forEach((v) => {
      v.fields.forEach((f) => {
        const fieldName = fieldNameFromPath(f);
        if (!result.has(fieldName)) {
          result.set(fieldName, { errors: [], warnings: [] });
        }
        const field = result.get(fieldName);
        if (field) {
          field[target].push({
            code: v.code,
            id: fieldName,
          });
        }
      });
    });
  };

  if (errors.length > 0) {
    process("errors", errors);
  } else if (warnings.length > 0) {
    // only process warnings if there are no errors
    process("warnings", warnings);
  }

  clientWarnings.forEach((warning) => {
    if (!result.has(warning.id)) {
      result.set(warning.id, { errors: [], warnings: [] });
    }
    const field = result.get(warning.id);
    if (field) {
      field.warnings.push(warning);
    }
  });

  return result;
}
