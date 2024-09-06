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
  format,
  defaultValue,
  inputProps,
  isTotal,
  isListTotal,
  id,
  isFocused = false,
  addSeparator,
}: InputGridRowProps) {
  const errors = errorsAndWarnings?.get(id)?.errors;
  const warnings = errorsAndWarnings
    ?.get(id)
    ?.warnings.filter((warning) => warning.code !== "REFORMAT_WARNING");
  const hasError = errors && errors.length > 0;
  const hasWarning = warnings && warnings.length > 0;

  const [value, setValue] = React.useState(() => (defaultValue ? format(defaultValue) : ""));
  return isListTotal ? (
    <InputGrid.ListTotal id={id}>
      <td>{field}</td>
      <td>
        <FormField hasError={hasError} hasWarning={hasWarning}>
          <input
            key={id}
            id={id}
            name={name || id}
            maxLength={11}
            {...inputProps}
            value={value}
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus={isFocused}
            aria-invalid={hasError || (hasWarning && !warningsAccepted) ? "true" : "false"}
            aria-errormessage={
              hasError
                ? "feedback-error"
                : hasWarning && !warningsAccepted
                  ? "feedback-warning"
                  : undefined
            }
            onChange={(e) => {
              setValue(format(e.currentTarget.value));
            }}
          />
        </FormField>
      </td>
      <td>{title}</td>
    </InputGrid.ListTotal>
  ) : (
    <InputGrid.Row isTotal={isTotal} isFocused={isFocused} addSeparator={addSeparator} id={id}>
      <td>{field}</td>
      <td>
        <FormField hasError={hasError} hasWarning={hasWarning}>
          <input
            key={id}
            id={id}
            name={name || id}
            maxLength={11}
            {...inputProps}
            value={value}
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus={isFocused}
            aria-invalid={hasError || (hasWarning && !warningsAccepted) ? "true" : "false"}
            aria-errormessage={
              hasError
                ? "feedback-error"
                : hasWarning && !warningsAccepted
                  ? "feedback-warning"
                  : undefined
            }
            onChange={(e) => {
              setValue(format(e.currentTarget.value));
            }}
          />
        </FormField>
      </td>
      <td>{title}</td>
    </InputGrid.Row>
  );
}
