import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import type { RadioSubsection, SectionValues } from "@/types/types";

import cls from "./CheckboxesRadioSubsection.module.css";

export interface RadioSubsectionProps {
  subsection: RadioSubsection;
  currentValues: SectionValues;
  setValues: (path: string, value: string) => void;
  errorsAndWarnings?: Map<string, "error" | "warning">;
  readOnly?: boolean;
}

export function RadioSubsectionComponent({
  subsection,
  currentValues,
  setValues,
  errorsAndWarnings,
  readOnly = false,
}: RadioSubsectionProps) {
  return (
    <div className={cls.container}>
      <ChoiceList>
        {subsection.title && <ChoiceList.Legend>{subsection.title}</ChoiceList.Legend>}
        {errorsAndWarnings?.get(`data.${subsection.path}`) && (
          <ChoiceList.Error id={`${subsection.path}-error`}>{subsection.error}</ChoiceList.Error>
        )}
        {subsection.options.map((option) => (
          <ChoiceList.Radio
            key={option.value}
            id={option.value}
            value={option.value}
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
    </div>
  );
}
