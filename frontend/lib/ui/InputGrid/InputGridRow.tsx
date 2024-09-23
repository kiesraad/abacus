import * as React from "react";

import { ErrorsAndWarnings } from "@kiesraad/api";
import { FormField, InputGrid } from "@kiesraad/ui";
import { FormatFunc } from "@kiesraad/util";

export interface InputGridRowProps {
  id: string;
  field: string;
  title: string;
  errorsAndWarnings?: Map<string, ErrorsAndWarnings>;
  warningsAccepted: boolean;
  inputProps: Partial<React.InputHTMLAttributes<HTMLInputElement>>;
  format: FormatFunc;
  name?: string;
  defaultValue?: string | number;
  isTotal?: boolean;
  isListTotal?: boolean;
  addSeparator?: boolean;
}

export function InputGridRow({
  field,
  name,
  title,
  errorsAndWarnings,
  warningsAccepted,
  format,
  defaultValue,
  inputProps,
  isTotal,
  isListTotal,
  id,
  addSeparator,
}: InputGridRowProps) {
  const errors = errorsAndWarnings?.get(id)?.errors;
  const warnings = errorsAndWarnings?.get(id)?.warnings.filter((warning) => warning.code !== "REFORMAT_WARNING");
  const hasError = errors && errors.length > 0;
  const hasWarning = warnings && warnings.length > 0;

  const [value, setValue] = React.useState(() => (defaultValue ? format(defaultValue) : ""));

  const children: [React.ReactElement, React.ReactElement, React.ReactElement] = [
    <td key={`${id}-1`}>{field}</td>,
    <td key={`${id}-2`} id={`cell-${id}`}>
      <FormField hasError={hasError} hasWarning={hasWarning}>
        <input
          key={id}
          id={id}
          name={name || id}
          maxLength={11}
          {...inputProps}
          value={value}
          aria-invalid={hasError || (hasWarning && !warningsAccepted) ? "true" : "false"}
          aria-errormessage={
            hasError ? "feedback-error" : hasWarning && !warningsAccepted ? "feedback-warning" : undefined
          }
          onChange={(e) => {
            setValue(format(e.currentTarget.value));
          }}
        />
      </FormField>
    </td>,
    <td key={`${id}-3`}>{title}</td>,
  ];
  return isListTotal ? (
    <InputGrid.ListTotal id={id}>{children}</InputGrid.ListTotal>
  ) : (
    <InputGrid.Row isTotal={isTotal} addSeparator={addSeparator} id={id}>
      {children}
    </InputGrid.Row>
  );
}
