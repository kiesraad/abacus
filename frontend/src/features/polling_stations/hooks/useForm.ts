import { useCallback, useState } from "react";

import { type FormFields, processForm, type ValidationResult } from "../utils/form";

export interface UseFormReturn<RequestObject> {
  process: (elements: { [key in keyof RequestObject]: HTMLInputElement }) => {
    isValid: boolean;
    requestObject: RequestObject;
  };
  isValid: boolean;
  validationResult: ValidationResult<RequestObject>;
}

export function useForm<RequestObject>(fields: FormFields<RequestObject>): UseFormReturn<RequestObject> {
  const [isValid, setIsValid] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult<RequestObject>>(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    {} as ValidationResult<RequestObject>,
  );

  const process = useCallback(
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
