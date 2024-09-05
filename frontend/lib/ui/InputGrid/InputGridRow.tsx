import * as React from "react";

import { ErrorsAndWarnings } from "@kiesraad/api";
import { IconWarningSquare } from "@kiesraad/icon";
import { FormField, Icon, InputGrid } from "@kiesraad/ui";
import { ellipsis, FormatFunc } from "@kiesraad/util";

export interface InputGridRowProps {
  id: string;
  field: string;
  title: string;
  errorsAndWarnings?: Map<string, ErrorsAndWarnings>;
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
  const tooltip = errorsAndWarnings
    ?.get(id)
    ?.warnings.find((warning) => warning.code === "REFORMAT_WARNING")?.value;

  const [value, setValue] = React.useState(() => (defaultValue ? format(defaultValue) : ""));
  return isListTotal ? (
    <InputGrid.ListTotal id={id}>
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
            key={id}
            id={id}
            name={name || id}
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
    </InputGrid.ListTotal>
  ) : (
    <InputGrid.Row isTotal={isTotal} isFocused={isFocused} addSeparator={addSeparator} id={id}>
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
            key={id}
            id={id}
            name={name || id}
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
