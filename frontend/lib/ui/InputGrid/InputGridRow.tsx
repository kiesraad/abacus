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
  return (
    <InputGrid.Row isTotal={isTotal}>
      <td>{field}</td>
      <td>
        <FormField error={errorsAndWarnings.get(name)?.errors}>
          <input id={name} name={name} maxLength={11} {...inputProps} defaultValue={defaultValue} />
        </FormField>
      </td>
      <td>{title}</td>
    </InputGrid.Row>
  );
}
