import { InputGrid } from "@/components/ui/InputGrid/InputGrid";
import { InputGridRow } from "@/components/ui/InputGrid/InputGridRow";
import { t } from "@/i18n/translate";
import { InputGridSubsection, InputGridSubsectionRow, SectionValues } from "@/types/types";

export interface InputGridSubsectionProps {
  subsection: InputGridSubsection;
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
  subsection,
  currentValues,
  setValues,
  defaultProps,
  missingTotalError,
  readOnly = false,
}: InputGridSubsectionProps) {
  return (
    <InputGrid zebra={subsection.zebra}>
      <InputGrid.Header>
        <th>{t(subsection.headers[0])}</th>
        <th>{t(subsection.headers[1])}</th>
        <th>{t(subsection.headers[2])}</th>
      </InputGrid.Header>
      <InputGrid.Body>
        {subsection.rows.map((row: InputGridSubsectionRow) => (
          <InputGridRow
            key={row.path}
            field={row.code || ""}
            id={`data.${row.path}`}
            title={row.title}
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
