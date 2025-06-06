import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { t } from "@/i18n/translate";

import { RadioSubsection, SectionValues } from "../../types/types";

export interface RadioSubsectionProps {
  subsection: RadioSubsection;
  currentValues: SectionValues;
  setValues: (path: string, value: string) => void;
  defaultProps: {
    errorsAndWarnings?: Map<string, "error" | "warning">;
    errorsAndWarningsAccepted: boolean;
  };
}

export function RadioSubsectionComponent({ subsection, currentValues, setValues, defaultProps }: RadioSubsectionProps) {
  return (
    <div className="radio-form">
      <ChoiceList>
        {defaultProps.errorsAndWarnings?.get(`data.${subsection.path}`) && (
          <ChoiceList.Error id={`${subsection.path}-error`}>{t(subsection.error)}</ChoiceList.Error>
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
            label={t(option.label)}
          />
        ))}
      </ChoiceList>
    </div>
  );
}
