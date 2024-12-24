import { deformatNumber, parseIntStrict } from "@kiesraad/util";

export type ValidationError =
  | "FORM_VALIDATION_RESULT_REQUIRED"
  | "FORM_VALIDATION_RESULT_MIN_LENGTH"
  | "FORM_VALIDATION_RESULT_MAX_LENGTH"
  | "FORM_VALIDATION_RESULT_INVALID_TYPE"
  | "FORM_VALIDATION_RESULT_INVALID_NUMBER"
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

type FieldValue<F extends AnyFormField> = F extends FormFieldNumber
  ? number
  : F extends FormFieldString
    ? string
    : never;

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
    let value: FieldValue<AnyFormField> = input.value.trim();

    if (!field.required && value === "") {
      continue;
    } else if (field.required && value === "") {
      validationResult[fieldName] = "FORM_VALIDATION_RESULT_REQUIRED";
      continue;
    }

    switch (field.type) {
      case "number": {
        const parsedValue = field.isFormatted ? deformatNumber(value) : parseIntStrict(value);
        //parseIntStrict is used in deformatNumber as well, the result is a number or undefined.
        if (parsedValue === undefined) {
          validationResult[fieldName] = "FORM_VALIDATION_RESULT_INVALID_NUMBER";
          continue;
        } else {
          value = parsedValue;
        }
        break;
      }
      case "string":
      default:
        break;
    }

    const error = validateFormValue(field, value);
    if (error) {
      validationResult[fieldName] = error;
    } else {
      requestObject[fieldName] = value as RequestObject[typeof fieldName];
    }
  }

  const isEmpty = Object.values(validationResult).every((value) => value === undefined);
  return { requestObject, validationResult, isValid: isEmpty };
}

export function validateFormValue(field: AnyFormField, value: string | number | undefined): ValidationError | null {
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
