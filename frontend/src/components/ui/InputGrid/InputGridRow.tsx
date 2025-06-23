import * as React from "react";

import { FormField } from "../FormField/FormField";
import { NumberInput } from "../NumberInput/NumberInput";
import { InputGrid } from "./InputGrid";
import cls from "./InputGrid.module.css";

export interface InputGridRowProps {
  id: string;
  field: string;
  title: string;
  errorsAndWarnings?: Map<string, "error" | "warning">;
  warningsAccepted?: boolean;
  name?: string;
  defaultValue?: string | number;
  isTotal?: boolean;
  isListTotal?: boolean;
  errorMessageId?: string;
  addSeparator?: boolean;
  autoFocusInput?: boolean;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
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
  value,
  onChange,
  readOnly,
}: InputGridRowProps) {
  const hasError = errorsAndWarnings?.get(id) === "error";
  const hasWarning = errorsAndWarnings?.get(id) === "warning";
  const hasUnacceptedWarning = hasWarning && !warningsAccepted;

  const errorMessage =
    errorMessageId || (hasError ? "feedback-error" : hasUnacceptedWarning ? "feedback-warning" : undefined);

  React.useEffect(() => {
    if (errorMessageId) {
      document.getElementById(id)?.focus();
    }
  }, [errorMessageId, id]);

  const children: [React.ReactElement, React.ReactElement, React.ReactElement] = [
    <td key={`${id}-1`} id={`field-${id}`}>
      {field}
    </td>,
    <td key={`${id}-2`} id={`cell-${id}`} className={readOnly ? cls.readOnly : undefined}>
      <FormField hasError={!!errorMessageId || hasError} hasWarning={hasWarning}>
        {readOnly ? (
          <span className="font-number">{value !== undefined ? value : defaultValue}</span>
        ) : (
          <NumberInput
            key={id}
            id={id}
            name={name || id}
            defaultValue={defaultValue}
            autoFocus={autoFocusInput}
            value={value}
            onChange={onChange}
            aria-labelledby={`field-${id} title-${id}`}
            aria-invalid={errorMessage !== undefined}
            aria-errormessage={errorMessage}
          />
        )}
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
