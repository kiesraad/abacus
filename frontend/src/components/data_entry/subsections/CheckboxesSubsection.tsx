import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import type { CheckboxesSubsection, SectionValues } from "@/types/types";

export interface CheckboxesSubsectionProps {
  subsection: CheckboxesSubsection;
  currentValues: SectionValues;
  setValues: (path: string, value: string) => void;
  errorsAndWarnings?: Map<string, "error" | "warning">;
  readOnly?: boolean;
}

export function CheckboxesSubsectionComponent({
  subsection,
  currentValues,
  setValues,
  errorsAndWarnings,
  readOnly = false,
}: CheckboxesSubsectionProps) {
  return (
    <div className="radio-form">
      <ChoiceList>
        {errorsAndWarnings?.get(`data.${subsection.error_path}`) && (
          <ChoiceList.Error id={`${subsection.error_path}-error`}>{subsection.error_message}</ChoiceList.Error>
        )}
        {subsection.options.map((option) => (
          <ChoiceList.Checkbox
            key={option.path}
            id={option.path}
            name={option.path}
            value="true"
            checked={currentValues[option.path] === "true"}
            onChange={(e) => {
              setValues(option.path, e.target.checked ? "true" : "false");
            }}
            label={option.label}
            autoFocus={option.autoFocusInput}
            hasError={errorsAndWarnings?.get(`data.${option.path}`) === "error"}
            disabled={readOnly}
          />
        ))}
      </ChoiceList>
    </div>
  );
}
