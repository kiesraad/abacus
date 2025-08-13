import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import type { CheckboxesSubsection, SectionValues } from "@/types/types";

import cls from "./CheckboxesRadioSubsection.module.css";

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
  const hasErrorOrWarning =
    errorsAndWarnings?.get(`data.${subsection.error_path}`) ||
    subsection.options.some((option) => errorsAndWarnings?.get(`data.${option.path}`));

  return (
    <div className={cls.container}>
      {subsection.title && <legend>{subsection.title}</legend>}
      <ChoiceList>
        {hasErrorOrWarning && (
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
            disabled={readOnly}
          />
        ))}
      </ChoiceList>
    </div>
  );
}
