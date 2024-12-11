//TODO: Refactor ValidationRules to FormProperties
import { deformatNumber } from "@kiesraad/util";

export type ValidationError =
  | "FORM_VALIDATION_RESULT_REQUIRED"
  | "FORM_VALIDATION_RESULT_MIN_LENGTH"
  | "FORM_VALIDATION_RESULT_MAX_LENGTH"
  | "FORM_VALIDATION_RESULT_INVALID_TYPE"
  | "FORM_VALIDATION_RESULT_MIN"
  | "FORM_VALIDATION_RESULT_MAX";

export type FormFieldBase = {
  required?: boolean;
  type: string;
};

export type FormFieldString = FormFieldBase & {
  type: "string";
  minLength?: number;
  maxLength?: number;
};

export type FormFieldNumber = FormFieldBase & {
  type: "number";
  isFormatted?: boolean;
  min?: number;
  max?: number;
};

export type AnyFormField = FormFieldNumber | FormFieldString;

export type FormFields<T> = Record<keyof T, AnyFormField>;
export type ValidationResult<T> = Record<keyof T, ValidationError | undefined>;

export function processForm<RequestObject>(
  fields: FormFields<RequestObject>,
  elements: { [key in keyof RequestObject]: HTMLInputElement },
): { requestObject: RequestObject; validationResult: ValidationResult<RequestObject>; isValid: boolean } {
  const requestObject: RequestObject = {} as RequestObject;
  const validationResult: ValidationResult<RequestObject> = {} as ValidationResult<RequestObject>;

  for (const fieldName in fields) {
    const field = fields[fieldName];
    const input = elements[fieldName];

    const value = getFormFieldValue(field, input);
    const error = validateFormValue(field, value);
    if (error) {
      validationResult[fieldName] = error;
      continue;
    }
    requestObject[fieldName] = value as unknown as RequestObject[typeof fieldName];
  }

  const isEmpty = Object.values(validationResult).every((value) => value === undefined);
  return { requestObject, validationResult, isValid: isEmpty };
}

export function getFormFieldValue(field: AnyFormField, input: HTMLInputElement): string | number {
  const value = input.value;
  if (value) {
    if (field.type === "number") {
      const parsedValue = field.isFormatted ? deformatNumber(value) : parseInt(value);
      return parsedValue;
    } else {
      return value;
    }
  } else {
    return "";
  }
}

export function validateFormValue(field: AnyFormField, value: string | number | undefined): ValidationError | null {
  if (field.required && (value === "" || value === undefined)) {
    return "FORM_VALIDATION_RESULT_REQUIRED";
  }
  switch (field.type) {
    case "string":
      if (typeof value === "string") {
        if (field.minLength && value.length < field.minLength) {
          return "FORM_VALIDATION_RESULT_MIN_LENGTH";
        }
        if (field.maxLength && value.length > field.maxLength) {
          return "FORM_VALIDATION_RESULT_MAX_LENGTH";
        }
      } else {
        return "FORM_VALIDATION_RESULT_INVALID_TYPE";
      }
      break;
    case "number":
      if (typeof value === "number") {
        if (field.min && value < field.min) {
          return "FORM_VALIDATION_RESULT_MIN";
        }
        if (field.max && value > field.max) {
          return "FORM_VALIDATION_RESULT_MAX";
        }
      } else {
        return "FORM_VALIDATION_RESULT_INVALID_TYPE";
      }
  }
  return null;
}

// export function validateRequestObject<T>(
//   fields: FormFields<T>,
//   obj: T,
// ): { isValid: boolean; validationResult: ValidationResult<T> } {
//   const result: ValidationResult<T> = {} as ValidationResult<T>;
//   Object.entries(fields).forEach(([key, value]) => {
//     const prop = key as keyof T;
//     const inputValue = obj[prop];
//     const rule = value as AnyFieldField;
//     if (inputValue === "" || inputValue === undefined) {
//       if (rule.required) {
//         result[prop] = "FORM_VALIDATION_RESULT_REQUIRED";
//       }
//       return;
//     }
//     switch (rule.type) {
//       case "string":
//         if (typeof inputValue === "string") {
//           if (rule.minLength && inputValue.length < rule.minLength) {
//             result[prop] = "FORM_VALIDATION_RESULT_MIN_LENGTH";
//           }
//           if (rule.maxLength && inputValue.length > rule.maxLength) {
//             result[prop] = "FORM_VALIDATION_RESULT_MAX_LENGTH";
//           }
//         } else {
//           result[prop] = "FORM_VALIDATION_RESULT_INVALID_TYPE";
//         }
//         break;
//       case "number":
//         if (typeof inputValue === "number") {
//           if (rule.min && inputValue < rule.min) {
//             result[prop] = "FORM_VALIDATION_RESULT_MIN_LENGTH";
//           }
//           if (rule.max && inputValue > rule.max) {
//             result[prop] = "FORM_VALIDATION_RESULT_MAX_LENGTH";
//           }
//         } else {
//           result[prop] = "FORM_VALIDATION_RESULT_INVALID_TYPE";
//         }
//     }
//   });
//   //check if result is empty
//   const isEmpty = Object.values(result).every((value) => value === undefined);

//   return { isValid: isEmpty, validationResult: result };
// }

// export function getRequestObjectFromFormElements<RequestObject>(
//   fields: FormFields<RequestObject>,
//   elements: { [key in keyof RequestObject]: HTMLInputElement },
// ) {
//   const obj: RequestObject = {} as RequestObject;

//   for (const fieldName in fields) {
//     const field = fields[fieldName];
//     if (elements[fieldName]) {
//       const value = elements[fieldName].value;
//       if (value) {
//         if (field.type === "number") {
//           const value = field.isFormatted
//             ? deformatNumber(elements[fieldName].value)
//             : parseInt(elements[fieldName].value);
//           obj[fieldName] = value as unknown as RequestObject[typeof fieldName];
//         } else {
//           obj[fieldName] = value as unknown as RequestObject[typeof fieldName];
//         }
//       } else {
//         obj[fieldName] = "" as unknown as RequestObject[typeof fieldName];
//       }
//     }
//   }
//   return obj as RequestObject;
// }
