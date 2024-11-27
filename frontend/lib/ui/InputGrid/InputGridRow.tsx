import * as React from "react";

import { ErrorsAndWarnings } from "@kiesraad/api";
import { FormField, InputGrid, NumberInput } from "@kiesraad/ui";

export interface InputGridRowProps {
  id: string;
  field: string;
  title: string;
  errorsAndWarnings?: Map<string, ErrorsAndWarnings>;
  warningsAccepted?: boolean;
  name?: string;
  defaultValue?: string | number;
  isTotal?: boolean;
  isListTotal?: boolean;
  errorMessageId?: string;
  addSeparator?: boolean;
  autoFocusInput?: boolean;
}

export function InputGridRow({
  field,
  name,
  title,
  errorsAndWarnings,
  warningsAccepted,
  defaultValue,
  isTotal,
  isListTotal,
  id,
  errorMessageId,
  addSeparator,
  autoFocusInput,
}: InputGridRowProps) {
  const errors = errorsAndWarnings?.get(id)?.errors;
  const warnings = errorsAndWarnings?.get(id)?.warnings;
  const hasError = errors && errors.length > 0;
  const hasWarning = warnings && warnings.length > 0;

  const children: [React.ReactElement, React.ReactElement, React.ReactElement] = [
    <td key={`${id}-1`} id={`field-${id}`}>
      {field}
    </td>,
    <td key={`${id}-2`} id={`cell-${id}`}>
      <FormField hasError={!!errorMessageId || hasError} hasWarning={hasWarning}>
        <NumberInput
          key={id}
          id={id}
          name={name || id}
          defaultValue={defaultValue}
          autoFocus={autoFocusInput}
          aria-labelledby={`field-${id} title-${id}`}
          aria-invalid={!!errorMessageId || hasError || (hasWarning && !warningsAccepted) ? "true" : "false"}
          aria-errormessage={
            errorMessageId
              ? errorMessageId
              : hasError
                ? "feedback-error"
                : hasWarning && !warningsAccepted
                  ? "feedback-warning"
                  : undefined
          }
        />
      </FormField>
    </td>,
    <td key={`${id}-3`} id={`title-${id}`}>
      {title}
    </td>,
  ];
  return isListTotal ? (
    <InputGrid.ListTotal id={id}>{children}</InputGrid.ListTotal>
  ) : (
    <InputGrid.Row isTotal={isTotal} addSeparator={addSeparator} id={id}>
      {children}
    </InputGrid.Row>
  );
}
