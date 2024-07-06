import * as React from "react";

import { ErrorsAndWarnings } from "@kiesraad/api";
import { IconWarningSquare } from "@kiesraad/icon";
import { ellipsis, FormatFunc } from "@kiesraad/util";

import { FormField } from "../FormField/FormField";
import { Icon } from "../Icon/Icon";
import { InputGrid } from "./InputGrid";

export interface InputGridRowProps {
  field: string;
  name: string;
  title: string;
  errorsAndWarnings: Map<string, ErrorsAndWarnings>;
  inputProps: Partial<React.InputHTMLAttributes<HTMLInputElement>>;
  format: FormatFunc;
  defaultValue?: string;
  isTotal?: boolean;
  isFocused?: boolean;
  addSeparator?: boolean;
}

export function InputGridRow({
  field,
  name,
  title,
  errorsAndWarnings,
  format,
  defaultValue,
  inputProps,
  isTotal,
  isFocused = false,
  addSeparator,
}: InputGridRowProps) {
  const errors = errorsAndWarnings.get(name)?.errors;
  const warnings = errorsAndWarnings
    .get(name)
    ?.warnings.filter((warning) => warning.code !== "REFORMAT_WARNING");
  const tooltip = errorsAndWarnings
    .get(name)
    ?.warnings.find((warning) => warning.code === "REFORMAT_WARNING")?.value;

  const [value, setValue] = React.useState(defaultValue || "");
  return (
    <InputGrid.Row isTotal={isTotal} isFocused={isFocused} addSeparator={addSeparator}>
      <td>{field}</td>
      <td>
        <FormField
          error={errors}
          warning={warnings}
          tooltip={
            tooltip && (
              <div className="tooltip-content">
                <Icon color="warning" icon={<IconWarningSquare />} />
                <div>
                  Je probeert <strong>{ellipsis(tooltip)}</strong> te plakken. Je kunt hier alleen
                  cijfers invullen.
                </div>
              </div>
            )
          }
        >
          <input
            key={name}
            id={name}
            name={name}
            maxLength={11}
            {...inputProps}
            value={value}
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus={isFocused}
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
