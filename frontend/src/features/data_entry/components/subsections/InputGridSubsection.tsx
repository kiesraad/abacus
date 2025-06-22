import { InputGrid } from "@/components/ui/InputGrid/InputGrid";
import { InputGridRow } from "@/components/ui/InputGrid/InputGridRow";
import { TranslationPath } from "@/i18n/i18n.types";
import { t } from "@/i18n/translate";
import { FormSectionId, InputGridSubsection, InputGridSubsectionRow, SectionValues } from "@/types/types";

export interface InputGridSubsectionProps {
  subsection: InputGridSubsection;
  sectionId: FormSectionId;
  currentValues: SectionValues;
  setValues: (path: string, value: string) => void;
  defaultProps: {
    errorsAndWarnings?: Map<string, "error" | "warning">;
    errorsAndWarningsAccepted: boolean;
  };
  missingTotalError: boolean;
}

export function InputGridSubsectionComponent({
  subsection,
  sectionId,
  currentValues,
  setValues,
  defaultProps,
  missingTotalError,
}: InputGridSubsectionProps) {
  return (
    <InputGrid zebra={subsection.zebra}>
      <InputGrid.Header>
        <th>{t(subsection.headers[0])}</th>
        <th>{t(subsection.headers[1])}</th>
        <th>{t(subsection.headers[2])}</th>
      </InputGrid.Header>
      <InputGrid.Body>
        {subsection.rows.map((row: InputGridSubsectionRow) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- dynamic title translation path cannot be typechecked
          const title = row.title || t(`${sectionId}.${row.path}` as TranslationPath);
          return (
            <InputGridRow
              key={row.path}
              field={row.code || ""}
              id={`data.${row.path}`}
              title={title}
              value={currentValues[row.path] || ""}
              onChange={(e) => {
                setValues(row.path, e.target.value);
              }}
              autoFocusInput={row.autoFocusInput || (missingTotalError && row.isListTotal)}
              addSeparator={row.addSeparator}
              isTotal={row.isTotal}
              isListTotal={row.isListTotal}
              errorMessageId={row.isListTotal && missingTotalError ? "missing-total-error" : undefined}
              {...defaultProps}
            />
          );
        })}
      </InputGrid.Body>
    </InputGrid>
  );
}
