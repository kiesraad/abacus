import * as React from "react";

import { FormFields, processForm, ValidationResult } from "@/utils";

export interface UseFormReturn<RequestObject> {
  process: (elements: { [key in keyof RequestObject]: HTMLInputElement }) => {
    isValid: boolean;
    requestObject: RequestObject;
  };
  isValid: boolean;
  validationResult: ValidationResult<RequestObject>;
}

export function useForm<RequestObject>(fields: FormFields<RequestObject>): UseFormReturn<RequestObject> {
  const [isValid, setIsValid] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult<RequestObject>>(
    {} as ValidationResult<RequestObject>,
  );

  const process = React.useCallback(
    (elements: { [key in keyof RequestObject]: HTMLInputElement }) => {
      const { requestObject, validationResult, isValid } = processForm(fields, elements);
      setValidationResult(validationResult);
      setIsValid(isValid);
      return { isValid, requestObject };
    },
    [fields],
  );

  return { process, isValid, validationResult };
}
