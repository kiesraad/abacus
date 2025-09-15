import { InputGrid } from "@/components/ui/InputGrid/InputGrid";
import { InputGridRow } from "@/components/ui/InputGrid/InputGridRow";
import { t } from "@/i18n/translate";
import { InputGridSubsection, InputGridSubsectionRow, SectionValues } from "@/types/types";

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
  return (
    <InputGrid id={id} zebra={subsection.zebra}>
      <InputGrid.Header
        field={subsection.headers[0]}
        previous={previousValues && t("data_entry.previous_value")}
        value={subsection.headers[1]}
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
            value={currentValues[row.path] || ""}
            onChange={(e) => {
              setValues(row.path, e.target.value);
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
