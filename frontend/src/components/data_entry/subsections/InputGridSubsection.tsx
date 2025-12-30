import { useState } from "react";

import { InputGrid } from "@/components/ui/InputGrid/InputGrid";
import { InputGridRow } from "@/components/ui/InputGrid/InputGridRow";
import { t } from "@/i18n/translate";
import type { InputGridSubsection, InputGridSubsectionRow, SectionValues } from "@/types/types";
import { correctedValue, determineCorrections } from "@/utils/dataEntryMapping";

export interface InputGridSubsectionProps {
  id?: string;
  subsection: InputGridSubsection;
  previousValues?: SectionValues;
  currentValues: SectionValues;
  setValues: (path: string, value: string) => void;
  defaultProps: {
    errorsAndWarnings?: Map<string, "error" | "warning">;
    errorsAndWarningsAccepted: boolean;
  };
  missingTotalError: boolean;
  readOnly?: boolean;
}

export function InputGridSubsectionComponent({
  id,
  subsection,
  previousValues,
  currentValues,
  setValues,
  defaultProps,
  missingTotalError,
  readOnly = false,
}: InputGridSubsectionProps) {
  // When correcting: prevent values that are identical to the previous values to be instantly cleared.
  const [inputValues, setInputValues] = useState<SectionValues>(() =>
    previousValues ? determineCorrections(previousValues, currentValues) : currentValues,
  );

  function handleChange(path: string, value: string) {
    setInputValues({ ...inputValues, [path]: value });
    setValues(path, previousValues ? correctedValue(previousValues[path], value) : value);
  }

  return (
    <InputGrid id={id} zebra={subsection.zebra}>
      <InputGrid.Header
        field={subsection.headers[0]}
        previous={previousValues && t("data_entry.original")}
        value={previousValues ? t("data_entry.corrected") : subsection.headers[1]}
        title={subsection.headers[2]}
      />
      <InputGrid.Body>
        {subsection.rows.map((row: InputGridSubsectionRow) => (
          <InputGridRow
            key={row.path}
            field={row.code || ""}
            id={`data.${row.path}`}
            title={row.title}
            previousValue={previousValues?.[row.path]}
            value={inputValues[row.path] || ""}
            onChange={(e) => {
              handleChange(row.path, e.target.value);
            }}
            autoFocusInput={row.autoFocusInput}
            addSeparator={row.addSeparator}
            isTotal={row.isTotal}
            isListTotal={row.isListTotal}
            errorMessageId={row.isListTotal && missingTotalError ? "missing-total-error" : undefined}
            readOnly={readOnly}
            {...defaultProps}
          />
        ))}
      </InputGrid.Body>
    </InputGrid>
  );
}
