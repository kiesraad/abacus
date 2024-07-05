import * as React from "react";
import { InputGrid } from "./InputGrid";
import { FormField } from "../FormField/FormField";
import { ErrorsAndWarnings } from "@kiesraad/api";
import { Icon } from "../Icon/Icon";
import { IconWarningSquare } from "@kiesraad/icon";
import { ellipsis, FormatFunc } from "@kiesraad/util";

export interface InputGridRowProps {
  field: string;
  name: string;
  title: string;
  errorsAndWarnings: Map<string, ErrorsAndWarnings>;
  inputProps: Partial<React.InputHTMLAttributes<HTMLInputElement>>;
  format: FormatFunc;
  defaultValue?: string;
  isTotal?: boolean;
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
    <InputGrid.Row isTotal={isTotal}>
      <td>{field}</td>
      <td>
        <FormField
          error={errors}
          warning={warnings}
          tooltip={
            tooltip && (
              <div>
                <Icon color="warning" icon={<IconWarningSquare />} />
                Je probeert <strong>{ellipsis(tooltip)}</strong> te plakken. Je kunt hier alleen
                cijfers invullen.
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
