import { type ChangeEvent, type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/utils/classnames";
import { formatNumber } from "@/utils/number";

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
  previousValue?: string;
  isTotal?: boolean;
  isListTotal?: boolean;
  errorMessageId?: string;
  addSeparator?: boolean;
  autoFocusInput?: boolean;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
}

export function InputGridRow({
  field,
  name,
  title,
  errorsAndWarnings,
  warningsAccepted,
  previousValue,
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
  const showPrevious = previousValue !== undefined;
  const corrected = showPrevious && value !== "";

  const errorMessage =
    errorMessageId || (hasError ? "feedback-error" : hasUnacceptedWarning ? "feedback-warning" : undefined);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errorMessageId) {
      inputRef.current?.focus();
      // calling scrollIntoView directly doesn't always scroll properly
      requestAnimationFrame(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [errorMessageId]);

  const children: ReactNode = (
    <>
      <td key={`field-${id}`} id={`field-${id}`} className={cls.field}>
        {field}
      </td>
      {previousValue !== undefined && (
        <td key={`previous-${id}`} id={`previous-${id}`} className={cn(cls.previous, corrected && cls.corrected)}>
          {formatNumber(previousValue)}
        </td>
      )}
      <td
        key={`value-${id}`}
        id={`value-${id}`}
        className={cn(cls.value, readOnly && cls.readOnly, corrected && cls.corrected)}
      >
        <FormField hasError={!!errorMessageId || hasError} hasWarning={hasWarning}>
          {readOnly ? (
            <span className="font-number">{value}</span>
          ) : (
            <NumberInput
              key={id}
              id={id}
              name={name || id}
              autoFocus={autoFocusInput}
              value={value}
              onChange={onChange}
              aria-labelledby={`field-${id} title-${id}`}
              aria-invalid={errorMessage !== undefined}
              aria-errormessage={errorMessage}
              ref={inputRef}
            />
          )}
        </FormField>
      </td>
      <td key={`title-${id}`} id={`title-${id}`} className={cls.title}>
        {title}
      </td>
    </>
  );
  return isListTotal ? (
    <InputGrid.ListTotal id={id} showPrevious={showPrevious}>
      {children}
    </InputGrid.ListTotal>
  ) : (
    <InputGrid.Row isTotal={isTotal} addSeparator={addSeparator} id={id} showPrevious={showPrevious}>
      {children}
    </InputGrid.Row>
  );
}
