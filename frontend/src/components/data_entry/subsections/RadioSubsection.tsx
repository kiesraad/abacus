import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { RadioSubsection, SectionValues } from "@/types/types";

import cls from "./CheckboxesRadioSubsection.module.css";

export interface RadioSubsectionProps {
  subsection: RadioSubsection;
  currentValues: SectionValues;
  setValues: (path: string, value: string) => void;
  defaultProps: {
    errorsAndWarnings?: Map<string, "error" | "warning">;
    errorsAndWarningsAccepted: boolean;
  };
  readOnly?: boolean;
}

export function RadioSubsectionComponent({
  subsection,
  currentValues,
  setValues,
  defaultProps,
  readOnly = false,
}: RadioSubsectionProps) {
  return (
    <fieldset className={`radio-form ${cls.container}`}>
      {subsection.title && <legend>{subsection.title}</legend>}
      <ChoiceList>
        {defaultProps.errorsAndWarnings?.get(`data.${subsection.path}`) && (
          <ChoiceList.Error id={`${subsection.path}-error`}>{subsection.error}</ChoiceList.Error>
        )}
        {subsection.options.map((option) => (
          <ChoiceList.Radio
            key={String(option.value)}
            id={String(option.value)}
            value={String(option.value)}
            name={subsection.path}
            autoFocus={option.autoFocusInput}
            checked={currentValues[subsection.path] === option.value}
            onChange={() => {
              setValues(subsection.path, option.value);
            }}
            label={option.label}
            disabled={readOnly}
          />
        ))}
      </ChoiceList>
    </fieldset>
  );
}
