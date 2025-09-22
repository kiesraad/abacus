import { CheckboxesSubsectionComponent } from "@/components/data_entry/subsections/CheckboxesSubsection";
import { HeadingSubsectionComponent } from "@/components/data_entry/subsections/HeadingSubsection";
import { InputGridSubsectionComponent } from "@/components/data_entry/subsections/InputGridSubsection";
import { MessageSubsectionComponent } from "@/components/data_entry/subsections/MessageSubsection";
import { RadioSubsectionComponent } from "@/components/data_entry/subsections/RadioSubsection";
import { DataEntrySection, SectionValues } from "@/types/types";

export interface DataEntrySubsectionsProps {
  section: DataEntrySection;
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

export function DataEntrySubsections({
  section,
  previousValues,
  currentValues,
  setValues,
  defaultProps,
  missingTotalError,
  readOnly = false,
}: DataEntrySubsectionsProps) {
  return (
    <>
      {section.subsections.map((subsection, subsectionIdx) => {
        switch (subsection.type) {
          case "heading":
            return <HeadingSubsectionComponent key={`heading-${subsectionIdx}`} subsection={subsection} />;
          case "message":
            return <MessageSubsectionComponent key={`message-${subsectionIdx}`} subsection={subsection} />;
          case "radio":
            return (
              <RadioSubsectionComponent
                key={`radio-${subsectionIdx}`}
                subsection={subsection}
                currentValues={currentValues}
                setValues={setValues}
                defaultProps={defaultProps}
                readOnly={readOnly}
              />
            );
          case "inputGrid":
            return (
              <InputGridSubsectionComponent
                key={`input-grid-${subsectionIdx}`}
                subsection={subsection}
                previousValues={previousValues}
                currentValues={currentValues}
                setValues={setValues}
                defaultProps={defaultProps}
                missingTotalError={missingTotalError}
                readOnly={readOnly}
              />
            );
          case "checkboxes":
            return (
              <CheckboxesSubsectionComponent
                key={`checkboxes-${subsectionIdx}`}
                subsection={subsection}
                currentValues={currentValues}
                setValues={setValues}
                errorsAndWarnings={defaultProps.errorsAndWarnings}
                readOnly={readOnly}
              />
            );
        }
      })}
    </>
  );
}
