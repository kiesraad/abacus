import { InputGrid } from "./InputGrid";
import { FormField } from "../FormField/FormField";
import { ErrorsAndWarnings } from "@kiesraad/api";

export interface InputGridRowProps {
  field: string;
  name: string;
  title: string;
  errorsAndWarnings: Map<string, ErrorsAndWarnings>;
  inputProps: Partial<React.InputHTMLAttributes<HTMLInputElement>>;
  defaultValue: string;
  isTotal?: boolean;
}

export function InputGridRow({
  field,
  name,
  title,
  errorsAndWarnings,
  defaultValue,
  inputProps,
  isTotal,
}: InputGridRowProps) {
  const errors = errorsAndWarnings.get(name)?.errors;
  const warnings = errorsAndWarnings.get(name)?.warnings;
  const tooltip = errorsAndWarnings
    .get(name)
    ?.warnings.find((warning) => warning.code === "REFORMAT_WARNING")?.value;

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
                Je probeert <strong>{tooltip}</strong> te plakken. Je kunt hier alleen cijfers
                invullen.
              </div>
            )
          }
        >
          <input id={name} name={name} maxLength={11} {...inputProps} defaultValue={defaultValue} />
        </FormField>
      </td>
      <td>{title}</td>
    </InputGrid.Row>
  );
}
