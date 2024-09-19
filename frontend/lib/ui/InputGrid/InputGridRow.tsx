import * as React from "react";

import { ErrorsAndWarnings } from "@kiesraad/api";
import { FormField, InputGrid, NumberInput } from "@kiesraad/ui";

export interface InputGridRowProps {
  id: string;
  field: string;
  title: string;
  errorsAndWarnings?: Map<string, ErrorsAndWarnings>;
  warningsAccepted: boolean;
  name?: string;
  defaultValue?: string | number;
  isTotal?: boolean;
  isListTotal?: boolean;
  isFocused?: boolean;
  addSeparator?: boolean;
  autoFocus?: boolean;
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
  isFocused = false,
  addSeparator,
}: InputGridRowProps) {
  const errors = errorsAndWarnings?.get(id)?.errors;
  const warnings = errorsAndWarnings?.get(id)?.warnings;
  const hasError = errors && errors.length > 0;
  const hasWarning = warnings && warnings.length > 0;

  const children: [React.ReactElement, React.ReactElement, React.ReactElement] = [
    <td key={`${id}-1`}>{field}</td>,
    <td key={`${id}-2`}>
      <FormField hasError={hasError} hasWarning={hasWarning}>
        <NumberInput
          key={id}
          id={id}
          name={name || id}
          defaultValue={defaultValue}
          /* eslint-disable-next-line jsx-a11y/no-autofocus */
          autoFocus={isFocused}
          aria-invalid={hasError || (hasWarning && !warningsAccepted) ? "true" : "false"}
          aria-errormessage={
            hasError ? "feedback-error" : hasWarning && !warningsAccepted ? "feedback-warning" : undefined
          }
        />
      </FormField>
    </td>,
    <td key={`${id}-3`}>{title}</td>,
  ];
  return isListTotal ? (
    <InputGrid.ListTotal id={id}>{children}</InputGrid.ListTotal>
  ) : (
    <InputGrid.Row isTotal={isTotal} isFocused={isFocused} addSeparator={addSeparator} id={id}>
      {children}
    </InputGrid.Row>
  );
}
